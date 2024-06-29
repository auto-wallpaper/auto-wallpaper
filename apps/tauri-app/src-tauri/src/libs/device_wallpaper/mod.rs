use tauri::Manager;

use crate::utils::append_to_path;

use super::stores::{
    albums::AlbumsRepository,
    base,
    user::{SelectedPromptType, UserRepository},
};

#[derive(Debug)]
pub enum DeviceWallpaperError {
    WallpaperNotFound,
    WallpaperChangeError,
    RepositoryError(base::Error),
}

impl From<base::Error> for DeviceWallpaperError {
    fn from(err: base::Error) -> Self {
        DeviceWallpaperError::RepositoryError(err)
    }
}

pub struct DeviceWallpaper {
    user_repository: UserRepository,
    albums_repository: AlbumsRepository,
    app_handle: tauri::AppHandle,
}

impl DeviceWallpaper {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            user_repository: UserRepository::open(app_handle),
            albums_repository: AlbumsRepository::open(app_handle),
            app_handle: app_handle.clone(),
        }
    }

    pub fn change_wallpaper(&self, prompt_id: String) -> Result<(), DeviceWallpaperError> {
        let app_data_dir = self.app_handle.path().app_data_dir().unwrap();
        let prompt_dir = append_to_path(&app_data_dir, &format!("/{}", prompt_id));

        let image_path = append_to_path(&prompt_dir, "/image.jpeg");

        if image_path.exists() {
            return wallpaper::set_from_path(image_path.to_str().unwrap())
                .or(Err(DeviceWallpaperError::WallpaperChangeError));
        }

        Err(DeviceWallpaperError::WallpaperNotFound)
    }

    pub fn refresh_wallpaper(&self) -> Result<(), DeviceWallpaperError> {
        let selected_prompt = self.user_repository.get_selected_prompt()?;

        match selected_prompt.prompt_type {
            SelectedPromptType::Album => {
                let prompts = self
                    .albums_repository
                    .get_prompts_recently_generated_first(selected_prompt.id)?;

                let chosen_prompt = prompts.last().unwrap();

                self.change_wallpaper(chosen_prompt.id.to_string())
            }
            SelectedPromptType::Prompt => self.change_wallpaper(selected_prompt.id),
        }
    }
}
