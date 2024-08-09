pub mod status_manager;
pub mod using_prompt_manager;
mod utils;

use log::{error, info};
use serde::Serialize;
use status_manager::Status;
use tauri::{Manager, PhysicalSize};
use tokio::io;
use using_prompt_manager::UsingPrompt;
use utils::{download_image_file, save_image_file};

use super::device_wallpaper::{self, DeviceWallpaper};
use super::stores;
use super::stores::albums::AlbumsRepository;
use super::stores::user::{SelectedPromptType, UserRepository};
use super::wallpaper_engine::email_providers::base::EmailProvider;
use super::wallpaper_engine::email_providers::one_sec_mail::OneSecMailProvider;
use super::wallpaper_engine::leonardo::Leonardo;
use super::{
    stores::user::Prompt,
    wallpaper_engine::{self, WallpaperEngine},
};

#[derive(Debug)]
pub enum Error {
    WallpaperEngineError(wallpaper_engine::Error),
    IOError(io::Error),
    HttpError(reqwest::Error),
    DeviceWallpaperError(device_wallpaper::Error),
    RepositoryError(stores::base::Error),
    MoreThanOneGenerationAtOnceError,
    PromptNotFound,
    Cancelled,
}

impl From<wallpaper_engine::Error> for Error {
    fn from(err: wallpaper_engine::Error) -> Self {
        Error::WallpaperEngineError(err)
    }
}

impl From<io::Error> for Error {
    fn from(err: io::Error) -> Self {
        Error::IOError(err)
    }
}

impl From<reqwest::Error> for Error {
    fn from(err: reqwest::Error) -> Self {
        Error::HttpError(err)
    }
}

impl From<device_wallpaper::Error> for Error {
    fn from(err: device_wallpaper::Error) -> Self {
        Error::DeviceWallpaperError(err)
    }
}

impl From<stores::base::Error> for Error {
    fn from(err: stores::base::Error) -> Self {
        Error::RepositoryError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

pub struct AppWallpaperEngine {
    engine: WallpaperEngine,
    device_wallpaper: DeviceWallpaper,
    user_repository: UserRepository,
    albums_repository: AlbumsRepository,
    app_handle: tauri::AppHandle,
}

impl AppWallpaperEngine {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            engine: WallpaperEngine::new(),
            device_wallpaper: DeviceWallpaper::new(&app_handle),
            user_repository: UserRepository::open(&app_handle),
            albums_repository: AlbumsRepository::open(&app_handle),
            app_handle: app_handle.clone(),
        }
    }

    async fn set_using_prompt(&self, using_prompt: Option<UsingPrompt>) {
        self.app_handle
            .state::<using_prompt_manager::Store>()
            .lock()
            .await
            .set(using_prompt);
    }

    async fn set_status(&self, status: Status) {
        self.app_handle
            .state::<status_manager::Store>()
            .lock()
            .await
            .set(status);
    }

    async fn get_status(&self) -> Status {
        self.app_handle
            .state::<status_manager::Store>()
            .lock()
            .await
            .get()
    }

    pub async fn cancel(&self) {
        self.set_status(Status::Cancelling).await;
        self.engine.cancel();
    }

    pub async fn generate_selected_prompt(&self) -> Result<()> {
        let selected_prompt = self.user_repository.get_selected_prompt()?;

        match selected_prompt.prompt_type {
            SelectedPromptType::Album => self.generate_by_album_id(selected_prompt.id).await,
            SelectedPromptType::Prompt => self.generate_by_prompt_id(selected_prompt.id).await,
        }
    }

    pub async fn generate_by_prompt_id(&self, prompt_id: String) -> Result<()> {
        let prompts = self.user_repository.get_prompts()?;

        let chosen_prompt = prompts
            .into_iter()
            .find(|item| item.id == prompt_id)
            .ok_or(Error::PromptNotFound)?;

        self.generate(chosen_prompt, None).await?;

        Ok(())
    }

    pub async fn generate_by_album_id(&self, album_id: String) -> Result<()> {
        let chosen_prompt_id = self
            .albums_repository
            .get_the_chosen_prompt_of_album(album_id.clone())?;

        let prompts = self.user_repository.get_prompts()?;

        let chosen_prompt = prompts
            .into_iter()
            .find(|item| item.id == chosen_prompt_id)
            .ok_or(Error::PromptNotFound)?;

        self.generate(chosen_prompt, Some(album_id)).await
    }

    pub async fn generate(&self, prompt: Prompt, album_id: Option<String>) -> Result<()> {
        if self.get_status().await != Status::Idle {
            return Err(Error::MoreThanOneGenerationAtOnceError);
        };

        let mut n = 0;

        let result = loop {
            let result = self.generate_core(prompt.clone(), album_id.clone()).await;

            if result.is_ok() || n == 2 {
                self.set_status(Status::Idle).await;

                break result;
            }

            if let Err(err) = result {
                match err {
                    Error::Cancelled => break Err(Error::Cancelled),
                    _ => {
                        error!(
                            "Wallpaper Engine failed while generating. tying again. reason: {:?}",
                            err
                        );
                    }
                }
            }

            n += 1;
        };

        self.user_repository
            .update_prompt_generated_at_field(prompt.clone().id)?;

        if result.is_ok() {
            self.device_wallpaper.refresh_wallpaper()?;
        }

        let using_prompt = UsingPrompt {
            album_id,
            ..prompt.clone().into()
        };

        #[derive(Debug, Serialize, Clone)]
        #[serde(rename_all = "camelCase")]
        struct FinishEventPayload {
            using_prompt: UsingPrompt,
        }

        let _ = self.app_handle.emit(
            "wallpaper-engine-finish",
            FinishEventPayload { using_prompt },
        );

        self.set_using_prompt(None).await;

        self.set_status(Status::Idle).await;

        result
    }

    async fn generate_core(&self, prompt: Prompt, album_id: Option<String>) -> Result<()> {
        let using_prompt = UsingPrompt {
            album_id,
            ..prompt.clone().into()
        };

        self.set_using_prompt(Some(using_prompt.clone())).await;

        self.set_status(Status::Initializing).await;

        let size = self.get_screen_size();

        let mut leonardo = Leonardo::new(OneSecMailProvider::new().unwrap());

        let generation_result: wallpaper_engine::Result<String> = async {
            self.engine.setup_account(&mut leonardo).await?;

            self.set_status(Status::Generating).await;

            let generation = self
                .engine
                .generate(&mut leonardo, prompt.clone(), size.width, size.height)
                .await?;

            let mut url = generation.url;

            if let Some(upscale_settings) = prompt.clone().upscale {
                self.set_status(Status::Upscaling).await;
                url = self
                    .engine
                    .upscale(&mut leonardo, generation.id, upscale_settings)
                    .await?;
            }

            Ok(url)
        }
        .await;

        let _ = self.engine.destroy(&mut leonardo);

        let generated_image_url = match generation_result {
            Ok(url) => Ok(url),
            Err(err) => match err {
                wallpaper_engine::Error::Cancelled => Err(Error::Cancelled),
                other => Err(other.into()),
            },
        }?;

        self.set_status(Status::Finalizing).await;

        self.download_and_save_image_file(prompt.id.clone(), generated_image_url)
            .await?;

        Ok(())
    }

    fn get_screen_size(&self) -> PhysicalSize<u32> {
        let default_size: PhysicalSize<u32> = PhysicalSize {
            height: 1,
            width: 1,
        };

        let size = match self.app_handle.primary_monitor() {
            Ok(monitor) => match monitor {
                Some(monitor) => monitor.size().clone(),
                None => default_size,
            },
            Err(_) => default_size,
        };

        size
    }

    async fn download_and_save_image_file(&self, prompt_id: String, url: String) -> Result<()> {
        let image_data = download_image_file(url).await?;

        let filepath = self
            .app_handle
            .path()
            .resolve(
                format!("{}/image.jpeg", prompt_id),
                tauri::path::BaseDirectory::AppData,
            )
            .unwrap();

        save_image_file(&image_data, filepath).await?;

        Ok(())
    }
}

pub fn handle_result(result: Result<()>) -> std::result::Result<(), String> {
    match result {
        Ok(_) => {
            info!("Wallpaper has been generated successfully");
        }
        Err(error) => {
            match error {
                Error::Cancelled => info!("Wallpaper generation has been canceled"),
                Error::MoreThanOneGenerationAtOnceError => info!("Wallpaper generation didn't start. Cannot generate more than 1 wallpaper at once"),
                _ => {
                    error!("Error: {:?}", error);
                    return Err(format!("{:?}", error));        
                }
            };
        }
    }

    Ok(())
}
