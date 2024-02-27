use crate::libs::device_wallpaper::{DeviceWallpaper, DeviceWallpaperError};

#[tauri::command]
pub fn refresh_wallpaper(app_handle: tauri::AppHandle) -> Result<(), String> {
    match DeviceWallpaper::new(app_handle).refresh_wallpaper() {
        Ok(_) => Ok(()),
        Err(error) => match error {
            DeviceWallpaperError::WallpaperNotFound => {
                println!("Error: {:?}", error);
                Ok(())
            }
            _ => Err(format!("{:?}", error)),
        },
    }
}
