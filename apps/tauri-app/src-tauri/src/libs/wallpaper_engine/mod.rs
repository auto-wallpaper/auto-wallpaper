pub mod managers;
mod models;
pub mod structs;

use rand::seq::SliceRandom;
use std::{cmp::Ordering, io, time::Duration};
use structs::{AIGenerationData, Album, AlbumSelectionType, Prompt, PromptUpscale, UsingPrompt};

use chrono::{DateTime, Utc};
use log::error;
use rimage::image::ImageError;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::Manager;
use tokio::{
    fs::{create_dir_all, File},
    io::AsyncWriteExt,
    time::sleep,
};

use crate::{
    states::prompt_engine::PromptEngineStore,
    utils::{append_to_path, generate_string, optimize_image},
    WallpaperEngineStatusStore, WallpaperEngineUsingPromptStore,
};

use self::{
    managers::status::WallpaperEngineStatus,
    models::{
        leonardo::{GetAIGenerationFeedGenerationStatus, Leonardo},
        mailbox::one_secmail::OneSecmail as Mailbox,
    },
    structs::{ScreenSize, WallpaperEngineError},
};

use super::{device_wallpaper::DeviceWallpaper, store::StoreManager};

const PASSWORD: &str = "abc123ABC!@#";

pub struct WallpaperEngine {
    leonardo: Option<Leonardo>,
    mailbox: Option<Mailbox>,
    temp_store: StoreManager,
    user_store: StoreManager,
    albums_store: StoreManager,
    device_wallpaper: DeviceWallpaper,
    app_handle: tauri::AppHandle,
}

impl WallpaperEngine {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            leonardo: None,
            mailbox: None,
            temp_store: StoreManager::make_temp_store(app_handle),
            user_store: StoreManager::make_user_store(app_handle),
            albums_store: StoreManager::make_albums_store(app_handle),
            device_wallpaper: DeviceWallpaper::new(app_handle),
            app_handle: app_handle.clone(),
        }
    }

    fn get_leonardo(&mut self) -> &mut Leonardo {
        self.leonardo.as_mut().unwrap()
    }

    fn get_mailbox(&mut self) -> &mut Mailbox {
        self.mailbox.as_mut().unwrap()
    }

    pub async fn generate_selected_prompt(&mut self) -> Result<UsingPrompt, WallpaperEngineError> {
        #[derive(Deserialize, PartialEq)]
        #[serde(rename_all = "lowercase")]
        enum SelectedPromptTypes {
            Prompt,
            Album,
        }

        #[derive(Deserialize)]
        struct SelectedPrompt {
            id: String,
            #[serde(rename = "type")]
            prompt_type: SelectedPromptTypes,
        }

        let selected_prompt = self
            .user_store
            .get::<SelectedPrompt>("selectedPrompt")?
            .unwrap();

        match selected_prompt.prompt_type {
            SelectedPromptTypes::Album => self.generate_by_album_id(&selected_prompt.id).await,
            SelectedPromptTypes::Prompt => self.generate_by_id(&selected_prompt.id, None).await,
        }
    }

    pub async fn generate_by_album_id(
        &mut self,
        album_id: &str,
    ) -> Result<UsingPrompt, WallpaperEngineError> {
        let albums = self.albums_store.get::<Vec<Album>>("albums")?.unwrap();

        let filtered_albums: Vec<Album> = albums
            .into_iter()
            .filter(|album| album.id == album_id)
            .collect();

        let chosen_album = filtered_albums.get(0).unwrap();

        let chosen_prompt = match chosen_album.selection_type {
            AlbumSelectionType::Random => chosen_album
                .prompts
                .choose(&mut rand::thread_rng())
                .unwrap()
                .clone(),
            AlbumSelectionType::Sequential => {
                let prompts = self.user_store.get::<Vec<Prompt>>("prompts")?.unwrap();

                let mut prompts_of_album = prompts
                    .into_iter()
                    .filter(|prompt| chosen_album.prompts.contains(&prompt.id))
                    .collect::<Vec<Prompt>>();

                prompts_of_album.sort_by(|a, b| {
                    if a.generated_at.is_none() {
                        return Ordering::Greater;
                    };
                    if b.generated_at.is_none() {
                        return Ordering::Less;
                    };

                    let offset = DateTime::parse_from_rfc3339(&b.generated_at.clone().unwrap())
                        .unwrap()
                        .timestamp()
                        - DateTime::parse_from_rfc3339(&a.generated_at.clone().unwrap())
                            .unwrap()
                            .timestamp();

                    if offset == 0 {
                        return Ordering::Equal;
                    }

                    if offset > 0 {
                        return Ordering::Greater;
                    }

                    Ordering::Less
                });

                let most_recent_generated_prompt = prompts_of_album.get(0).unwrap();

                let index = if let Some(index) = chosen_album
                    .prompts
                    .clone()
                    .into_iter()
                    .position(|prompt| prompt == most_recent_generated_prompt.id)
                {
                    if index + 1 < chosen_album.prompts.len() {
                        index + 1
                    } else {
                        0
                    }
                } else {
                    0
                };

                chosen_album.prompts[index].clone()
            }
        };

        self.generate_by_id(&chosen_prompt, Some(chosen_album.id.clone()))
            .await
    }

    fn get_prompt_engine(&self) -> tauri::State<'_, PromptEngineStore> {
        let store = self.app_handle.state::<PromptEngineStore>();

        store
    }

    fn get_status(&self) -> tauri::State<'_, WallpaperEngineStatusStore> {
        let store = self.app_handle.state::<WallpaperEngineStatusStore>();

        store
    }

    fn get_using_prompt(&self) -> tauri::State<'_, WallpaperEngineUsingPromptStore> {
        let store = self.app_handle.state::<WallpaperEngineUsingPromptStore>();

        store
    }

    pub async fn generate_by_id(
        &mut self,
        prompt_id: &str,
        album_id: Option<String>,
    ) -> Result<UsingPrompt, WallpaperEngineError> {
        if !self.get_status().status.lock().await.is_idle() {
            return Err(WallpaperEngineError::MoreThanOneGenerationAtOnceError);
        }

        let mut result: Option<Result<UsingPrompt, WallpaperEngineError>> = None;

        for i in 0..3 {
            match self.generate(prompt_id, album_id.clone()).await {
                Ok(r) => {
                    result = Some(Ok(r));
                    break;
                }
                Err(error) => {
                    match error {
                        WallpaperEngineError::Canceled
                        | WallpaperEngineError::UsingPromptError(_) => {
                            result = Some(Err(error));
                            break;
                        }
                        _ => (),
                    }

                    if i == 2 {
                        result = Some(Err(error));
                        break;
                    }

                    error!(
                        "Wallpaper generation has been failed. trying again. the error: {:?}",
                        error
                    );

                    continue;
                }
            }
        }

        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Idle)?;

        self.get_using_prompt().using_prompt.lock().await.clear()?;

        self.temp_store
            .set(
                "lastGenerationTimestamp",
                json!(Utc::now().format("%Y-%m-%dT%H:%M:%S.%fZ").to_string()),
            )
            .unwrap();

        let _ = self.get_leonardo().delete_account().await;

        match result {
            Some(result) => match result {
                Ok(r) => {
                    let prompts = self.user_store.get::<Vec<Prompt>>("prompts")?.unwrap();
                    self.user_store.set(
                        "prompts",
                        json!(prompts
                            .into_iter()
                            .map(|prompt| {
                                if prompt.id == prompt_id {
                                    let mut clone = prompt.clone();

                                    clone.generated_at = Some(
                                        Utc::now().format("%Y-%m-%dT%H:%M:%S.%fZ").to_string(),
                                    );

                                    return clone;
                                }

                                prompt
                            })
                            .collect::<Vec<Prompt>>()),
                    )?;

                    self.device_wallpaper.refresh_wallpaper()?;

                    #[derive(Debug, Serialize, Clone)]
                    #[serde(rename_all = "camelCase")]
                    struct FinishEventPayload {
                        using_prompt: UsingPrompt,
                    }

                    self.app_handle.emit(
                        "wallpaper-engine-finish",
                        FinishEventPayload {
                            using_prompt: r.clone(),
                        },
                    )?;

                    Ok(r)
                }
                Err(e) => Err(e),
            },
            None => Err(WallpaperEngineError::UnexpectedError),
        }
    }

    async fn generate(
        &mut self,
        prompt_id: &str,
        album_id: Option<String>,
    ) -> Result<UsingPrompt, WallpaperEngineError> {
        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Initializing)?;

        let using_prompt = self
            .get_using_prompt()
            .using_prompt
            .lock()
            .await
            .set(prompt_id, album_id)?;

        self.mailbox = Some(Mailbox::new()?);
        self.leonardo = Some(Leonardo::new()?);

        self.check_status().await?;

        self.signup().await?;

        self.check_status().await?;

        self.confirm_signup().await?;

        self.check_status().await?;

        self.login().await?;

        self.check_status().await?;

        self.update_username().await?;

        self.check_status().await?;

        self.update_user_details().await?;

        self.check_status().await?;

        self.start_user_alchemy_trial().await?;

        self.check_status().await?;

        let generation_id = self.create_sd_generation_job().await?;

        self.check_status().await?;

        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::GeneratingImage)?;

        let generated_image = self.get_ai_generation_job(generation_id).await?;

        self.check_status().await?;

        let url = match using_prompt.upscale {
            Some(upscale_settings) => {
                self.get_status()
                    .status
                    .lock()
                    .await
                    .set(WallpaperEngineStatus::Upscaling)?;

                self.upscale(generated_image.id, upscale_settings).await?
            }
            None => generated_image.url,
        };

        let file_response = reqwest::get(url).await?;

        self.check_status().await?;

        let image_data = file_response.bytes().await?.to_vec();

        self.check_status().await?;

        self.save_image_file(&image_data, "image.jpeg").await?;

        self.check_status().await?;

        self.optimize_image("image.jpeg").await?;

        self.check_status().await?;

        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Finalizing)?;

        self.check_status().await?;

        Ok(self
            .get_using_prompt()
            .using_prompt
            .lock()
            .await
            .get()
            .unwrap())
    }

    async fn check_status(&mut self) -> Result<(), WallpaperEngineError> {
        if self.get_status().status.lock().await.is_canceling() {
            self.get_status()
                .status
                .lock()
                .await
                .set(WallpaperEngineStatus::Idle)?;
            return Err(WallpaperEngineError::Canceled);
        }

        Ok(())
    }

    async fn signup(&mut self) -> Result<(), WallpaperEngineError> {
        for _ in 0..5 {
            self.get_mailbox().init().await?;

            let email = self.get_mailbox().get_email();

            let response = self.get_leonardo().signup(email, PASSWORD).await?;

            if response.code_delivery_details.is_none() {
                continue;
            }

            return Ok(());
        }

        return Err(WallpaperEngineError::SignupError);
    }

    async fn confirm_signup(&mut self) -> Result<(), WallpaperEngineError> {
        let mut code: Option<String> = None;

        for _ in 0..5 {
            self.check_status().await?;
            sleep(Duration::from_secs(2)).await;
            self.check_status().await?;

            code = Some(match self.get_mailbox().lookup_confirmation_code().await? {
                Some(code) => code,
                None => continue,
            });
        }

        if code.is_none() {
            return Err(WallpaperEngineError::ConfirmationCodeError);
        }

        let email = self.get_mailbox().get_email();

        self.get_leonardo()
            .confirm_signup(email, PASSWORD, code.unwrap())
            .await?;

        Ok(())
    }

    async fn login(&mut self) -> Result<(), reqwest::Error> {
        let email = self.get_mailbox().get_email();

        self.get_leonardo().login(email, PASSWORD).await?;

        Ok(())
    }

    async fn update_username(&mut self) -> Result<(), WallpaperEngineError> {
        for i in 0..5 {
            sleep(Duration::from_secs(1)).await;

            match self
                .get_leonardo()
                .update_username(generate_string(15))
                .await
            {
                Ok(_) => {
                    return Ok(());
                }
                Err(e) => {
                    if i == 4 {
                        return Err(WallpaperEngineError::GraphQLError(e));
                    }
                }
            };
        }

        Err(WallpaperEngineError::UpdateUsernameError)
    }

    async fn update_user_details(&mut self) -> Result<(), WallpaperEngineError> {
        self.get_leonardo().update_user_details().await?;

        Ok(())
    }

    async fn start_user_alchemy_trial(&mut self) -> Result<(), WallpaperEngineError> {
        self.get_leonardo().start_user_alchemy_trial().await?;

        Ok(())
    }

    async fn create_sd_generation_job(&mut self) -> Result<String, WallpaperEngineError> {
        let prompt = self
            .get_using_prompt()
            .using_prompt
            .lock()
            .await
            .get()
            .unwrap()
            .prompt;

        let generated_prompt = self
            .get_prompt_engine()
            .prompt_engine
            .lock()
            .await
            .generate(prompt)
            .await?;

        let screen_size = self.get_screen_size();

        let leonardo = self.get_leonardo();

        let generation_id = leonardo
            .create_sd_generation_job(
                generated_prompt,
                1,
                if screen_size.x > screen_size.y {
                    1536
                } else {
                    (screen_size.x * 1536) / screen_size.y
                },
                if screen_size.y > screen_size.x {
                    1536
                } else {
                    (screen_size.y * 1536) / screen_size.x
                },
            )
            .await?;

        Ok(generation_id)
    }

    async fn get_ai_generation_job(
        &mut self,
        generation_id: String,
    ) -> Result<AIGenerationData, WallpaperEngineError> {
        // waiting for 1 minute
        for _ in 0..12 {
            self.check_status().await?;

            sleep(Duration::from_secs(5)).await;

            self.check_status().await?;

            let response = match self
                .get_leonardo()
                .get_ai_generation_job(generation_id.clone())
                .await
            {
                Ok(v) => v,
                Err(_) => continue,
            };

            let generated = match response.generations.get(0) {
                Some(v) => v,
                None => continue,
            };

            match generated.status {
                GetAIGenerationFeedGenerationStatus::COMPLETE => {
                    let generated_image = match generated.generated_images.get(0) {
                        Some(v) => v,
                        None => continue,
                    };

                    return Ok(AIGenerationData {
                        id: generated_image.id.clone(),
                        url: generated_image.url.clone(),
                    });
                }
                GetAIGenerationFeedGenerationStatus::FAILED => continue,
                GetAIGenerationFeedGenerationStatus::PENDING => continue,
            }
        }

        return Err(WallpaperEngineError::AIGenerateTimeout);
    }

    async fn upscale(
        &mut self,
        generated_image_id: String,
        upscale_settings: PromptUpscale,
    ) -> Result<String, WallpaperEngineError> {
        let leonardo = self.get_leonardo();

        let generation_id = leonardo
            .create_universal_upscaler_job(
                generated_image_id,
                upscale_settings.creativity_strength,
                upscale_settings.style,
            )
            .await?;

        return self.get_image_variation_by_fk(generation_id).await;
    }

    async fn get_image_variation_by_fk(
        &mut self,
        generation_id: String,
    ) -> Result<String, WallpaperEngineError> {
        // waiting for 1 minute
        for _ in 0..12 {
            self.check_status().await?;

            sleep(Duration::from_secs(5)).await;

            self.check_status().await?;

            let data = self
                .get_leonardo()
                .get_image_variation_by_fk(generation_id.clone())
                .await?;

            match data.status {
                GetAIGenerationFeedGenerationStatus::COMPLETE => {
                    let url = match data.url {
                        Some(v) => v,
                        None => continue,
                    };

                    return Ok(url.clone());
                }
                GetAIGenerationFeedGenerationStatus::FAILED => continue,
                GetAIGenerationFeedGenerationStatus::PENDING => continue,
            }
        }

        return Err(WallpaperEngineError::AIGenerateTimeout);
    }

    async fn save_image_file(
        &mut self,
        file_data: &Vec<u8>,
        filename: &str,
    ) -> Result<(), io::Error> {
        let app_data_dir = self.app_handle.path().app_data_dir().unwrap();

        let file_path = append_to_path(
            &append_to_path(
                &app_data_dir,
                &format!(
                    "/{}",
                    self.get_using_prompt()
                        .using_prompt
                        .lock()
                        .await
                        .get()
                        .unwrap()
                        .id
                ),
            ),
            &format!("/{}", filename),
        );

        let parent = file_path.parent().unwrap();

        if !parent.exists() {
            create_dir_all(parent).await?;
        }

        let mut file = File::create(file_path).await?;

        file.write_all(&file_data).await?;

        Ok(())
    }

    async fn optimize_image(&self, filename: &str) -> Result<(), ImageError> {
        let prompt_id = self
            .get_using_prompt()
            .using_prompt
            .lock()
            .await
            .get()
            .unwrap()
            .id;

        let file_path = self
            .app_handle
            .path()
            .resolve(
                &format!("{}/{}", prompt_id, filename),
                tauri::path::BaseDirectory::AppData,
            )
            .unwrap();

        let screen_size = self.get_screen_size();

        optimize_image(&file_path, &file_path, screen_size.x, screen_size.y)
    }

    fn get_screen_size(&self) -> ScreenSize {
        self.user_store
            .get::<ScreenSize>("screenSize")
            .unwrap()
            .unwrap_or(ScreenSize { x: 1, y: 1 })
    }
}
