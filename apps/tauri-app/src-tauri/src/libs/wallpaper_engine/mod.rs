pub mod managers;
mod models;
pub mod structs;

use std::{io, time::Duration};

use chrono::Utc;
use log::error;
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
    utils::{append_to_path, generate_string},
    WallpaperEngineStatusStore, WallpaperEngineUsingPromptStore,
};

use self::{
    managers::status::WallpaperEngineStatus,
    models::{
        leonardo::{GetAIGenerationFeedGenerationStatus, Leonardo},
        mailbox::mail_tm::MailTm as Mailbox,
        upscale::Upscale,
    },
    structs::{Prompt, WallpaperEngineError},
};

use super::{device_wallpaper::DeviceWallpaper, store::StoreManager};

const PASSWORD: &str = "abc123ABC!@#";

pub struct WallpaperEngine {
    leonardo: Option<Leonardo>,
    mailbox: Option<Mailbox>,
    upscale: Option<Upscale>,
    temp_store: StoreManager,
    user_store: StoreManager,
    device_wallpaper: DeviceWallpaper,
    app_handle: tauri::AppHandle,
}

impl WallpaperEngine {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self {
            leonardo: None,
            mailbox: None,
            upscale: None,
            temp_store: StoreManager::make_temp_store(app_handle.app_handle()),
            user_store: StoreManager::make_user_store(app_handle.app_handle()),
            device_wallpaper: DeviceWallpaper::new(app_handle.app_handle()),
            app_handle,
        }
    }

    fn get_leonardo(&mut self) -> &mut Leonardo {
        self.leonardo.as_mut().unwrap()
    }

    fn get_mailbox(&mut self) -> &mut Mailbox {
        self.mailbox.as_mut().unwrap()
    }

    fn get_upscale(&mut self) -> &mut Upscale {
        self.upscale.as_mut().unwrap()
    }

    pub async fn generate_selected_prompt(&mut self) -> Result<Prompt, WallpaperEngineError> {
        let selected_prompt_id = self.user_store.get::<String>("selectedPrompt")?.unwrap();

        self.generate_by_prompt_id(&selected_prompt_id).await
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

    pub async fn generate_by_prompt_id(
        &mut self,
        prompt_id: &str,
    ) -> Result<Prompt, WallpaperEngineError> {
        if !self.get_status().status.lock().await.is_idle() {
            return Err(WallpaperEngineError::MoreThanOneGenerationAtOnceError);
        }

        let mut result: Option<Result<Prompt, WallpaperEngineError>> = None;

        for i in 0..3 {
            match self.generate(prompt_id).await {
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

        match result {
            Some(result) => match result {
                Ok(r) => {
                    #[derive(Debug, Serialize, Clone)]
                    #[serde(rename_all = "camelCase")]
                    struct FinishEventPayload {
                        using_prompt: Prompt,
                    }

                    self.app_handle.emit_all(
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

    async fn generate(&mut self, prompt_id: &str) -> Result<Prompt, WallpaperEngineError> {
        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Initializing)?;

        self.get_using_prompt()
            .using_prompt
            .lock()
            .await
            .set(prompt_id)?;

        self.mailbox = Some(Mailbox::new()?);
        self.leonardo = Some(Leonardo::new()?);
        self.upscale = Some(Upscale::new().await?);

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

        let generated_image_url = self.get_ai_generation_job(generation_id).await?;

        self.check_status().await?;

        let file_response = reqwest::get(generated_image_url).await?;

        self.check_status().await?;

        let original_image = file_response.bytes().await?.to_vec();

        self.check_status().await?;

        self.save_image_file(&original_image, "original.jpeg")
            .await?;

        self.check_status().await?;

        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Upscaling)?;

        let upscale_image = self.upscale(original_image).await?;

        self.check_status().await?;

        self.get_status()
            .status
            .lock()
            .await
            .set(WallpaperEngineStatus::Finalizing)?;

        self.save_image_file(&upscale_image, "upscale.jpeg").await?;

        self.check_status().await?;

        self.device_wallpaper.refresh_wallpaper()?;

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
        #[derive(Debug, Deserialize)]
        struct ScreenSize {
            x: u32,
            y: u32,
        }

        let screen_size = self
            .user_store
            .get::<ScreenSize>("screenSize")
            .unwrap()
            .unwrap_or(ScreenSize { x: 1, y: 1 });

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
    ) -> Result<String, WallpaperEngineError> {
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

                    return Ok(generated_image.url.clone());
                }
                GetAIGenerationFeedGenerationStatus::FAILED => continue,
            }
        }

        return Err(WallpaperEngineError::AIGenerateTimeout);
    }

    async fn upscale(&mut self, file_data: Vec<u8>) -> Result<Vec<u8>, WallpaperEngineError> {
        self.get_upscale()
            .upload(file_data, "my_image.jpeg")
            .await?;

        self.check_status().await?;

        self.get_upscale().upscale().await?;

        self.check_status().await?;

        self.get_upscale().process().await?;

        self.check_status().await?;

        let upscale_image = self.get_upscale().download().await?;

        Ok(upscale_image)
    }

    async fn save_image_file(
        &mut self,
        file_data: &Vec<u8>,
        filename: &str,
    ) -> Result<(), io::Error> {
        let app_data_dir = self.app_handle.path_resolver().app_data_dir().unwrap();

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
