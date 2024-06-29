pub mod managers;
mod models;
pub mod structs;

use std::{io, time::Duration};
use structs::{AIGenerationData, UsingPrompt};

use log::error;
use serde::Serialize;
use tauri::Manager;
use tokio::{
    fs::{create_dir_all, File},
    io::AsyncWriteExt,
    time::sleep,
};

use crate::{
    libs::stores::user::SelectedPromptType,
    states::prompt_engine::PromptEngineStore,
    utils::{append_to_path, generate_string},
    WallpaperEngineStatusStore, WallpaperEngineUsingPromptStore,
};

use self::{
    managers::status::WallpaperEngineStatus,
    models::{
        leonardo::{GetAIGenerationFeedGenerationStatus, Leonardo},
        mailbox::one_secmail::OneSecmail as Mailbox,
    },
    structs::WallpaperEngineError,
};

use super::{
    device_wallpaper::DeviceWallpaper,
    stores::{
        albums::AlbumsRepository,
        user::{PromptUpscale, UserRepository},
    },
};

const PASSWORD: &str = "abc123ABC!@#";

pub struct WallpaperEngine {
    leonardo: Option<Leonardo>,
    mailbox: Option<Mailbox>,
    user_repository: UserRepository,
    albums_repository: AlbumsRepository,
    device_wallpaper: DeviceWallpaper,
    app_handle: tauri::AppHandle,
}

impl WallpaperEngine {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            leonardo: None,
            mailbox: None,
            user_repository: UserRepository::open(app_handle),
            albums_repository: AlbumsRepository::open(app_handle),
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
        let selected_prompt = self.user_repository.get_selected_prompt()?;

        match selected_prompt.prompt_type {
            SelectedPromptType::Album => self.generate_by_album_id(selected_prompt.id).await,
            SelectedPromptType::Prompt => self.generate_by_id(&selected_prompt.id, None).await,
        }
    }

    pub async fn generate_by_album_id(
        &mut self,
        album_id: String,
    ) -> Result<UsingPrompt, WallpaperEngineError> {
        let chosen_prompt_id = self
            .albums_repository
            .get_the_chosen_prompt_of_album(album_id.clone())?;

        self.generate_by_id(&chosen_prompt_id, Some(album_id)).await
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

        let mut generation_result: Option<Result<UsingPrompt, WallpaperEngineError>> = None;

        for i in 0..3 {
            match self.generate(prompt_id, album_id.clone()).await {
                Ok(r) => {
                    generation_result = Some(Ok(r));
                    break;
                }
                Err(error) => {
                    match error {
                        WallpaperEngineError::Canceled
                        | WallpaperEngineError::UsingPromptError(_) => {
                            generation_result = Some(Err(error));
                            break;
                        }
                        _ => (),
                    }

                    if i == 2 {
                        generation_result = Some(Err(error));
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

        self.get_using_prompt().using_prompt.lock().await.clear()?;

        let _ = self.get_leonardo().delete_account().await;

        let result = match generation_result {
            Some(result) => match result {
                Ok(r) => {
                    self.user_repository
                        .update_prompt_generated_at_field(prompt_id.to_string())?;

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
        };

        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Idle)?;

        return result;
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

        let screen_size = self.user_repository.get_screen_size()?;

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
}
