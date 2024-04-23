use tauri::Manager;

use crate::utils::append_to_path;

use super::store::StoreManager;

#[derive(Debug)]
pub enum DeviceWallpaperError {
    WallpaperNotFound,
    WallpaperChangeError,
    StorePluginError(tauri_plugin_store::Error),
}

impl From<tauri_plugin_store::Error> for DeviceWallpaperError {
    fn from(err: tauri_plugin_store::Error) -> Self {
        DeviceWallpaperError::StorePluginError(err)
    }
}

pub struct DeviceWallpaper {
    user_store: StoreManager,
    app_handle: tauri::AppHandle,
}

impl DeviceWallpaper {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            user_store: StoreManager::make_user_store(app_handle),
            app_handle: app_handle.clone(),
        }
    }

    pub fn refresh_wallpaper(&self) -> Result<(), DeviceWallpaperError> {
        let selected_prompt_id = self.user_store.get::<String>("selectedPrompt")?.unwrap();

        let app_data_dir = self.app_handle.path().app_data_dir().unwrap();
        let prompt_dir = append_to_path(&app_data_dir, &format!("/{}", selected_prompt_id));

        let upscale_image_path = append_to_path(&prompt_dir, "/upscale.jpeg");

        if upscale_image_path.exists() {
            return wallpaper::set_from_path(upscale_image_path.to_str().unwrap())
                .or(Err(DeviceWallpaperError::WallpaperChangeError));
        }

        let original_image_path = append_to_path(&prompt_dir, "/original.jpeg");

        if original_image_path.exists() {
            return wallpaper::set_from_path(original_image_path.to_str().unwrap())
                .or(Err(DeviceWallpaperError::WallpaperChangeError));
        }

        Err(DeviceWallpaperError::WallpaperNotFound)
    }
}
