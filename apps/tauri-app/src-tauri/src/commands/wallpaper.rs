use log::error;

use crate::libs::device_wallpaper::{DeviceWallpaper, DeviceWallpaperError};

#[tauri::command]
pub async fn refresh_wallpaper(app_handle: tauri::AppHandle) -> Result<(), String> {
    match DeviceWallpaper::new(&app_handle).refresh_wallpaper() {
        Ok(_) => Ok(()),
        Err(error) => match error {
            DeviceWallpaperError::WallpaperNotFound => {
                error!("Device Wallpaper Change Error: {:?}", error);
                Ok(())
            }
            _ => Err(format!("{:?}", error)),
        },
    }
}
