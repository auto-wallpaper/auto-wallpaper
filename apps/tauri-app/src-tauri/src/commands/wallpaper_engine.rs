use log::{error, info};
use tauri::State;

use crate::{
    libs::app_wallpaper_engine::{self, status_manager, using_prompt_manager},
    states::wallpaper_engine::AppWallpaperEngineStore,
};

fn handle_result(result: app_wallpaper_engine::Result<()>) -> Result<(), String> {
    match result {
        Ok(_) => {
            info!("Wallpaper has been generated successfully");
        }
        Err(error) => {
            match error {
                app_wallpaper_engine::Error::Cancelled => info!("Wallpaper generation has been canceled"),
                app_wallpaper_engine::Error::MoreThanOneGenerationAtOnceError => info!("Wallpaper generation didn't start. Cannot generate more than 1 wallpaper at once"),
                _ => {
                    error!("Error: {:?}", error);
                    return Err(format!("{:?}", error));        
                }
            };
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn generate_selected_prompt(
    app_wallpaper_engine_store: State<'_, AppWallpaperEngineStore>,
) -> Result<(), String> {
    handle_result(app_wallpaper_engine_store.generate_selected_prompt().await)
}

#[tauri::command]
pub async fn generate_by_prompt_id(
    wallpaper_engine_store: State<'_, AppWallpaperEngineStore>,
    prompt_id: String,
) -> Result<(), String> {
    handle_result(
        wallpaper_engine_store
            .generate_by_prompt_id(prompt_id)
            .await,
    )
}

#[tauri::command]
pub async fn generate_by_album_id(
    wallpaper_engine_store: State<'_, AppWallpaperEngineStore>,
    album_id: String,
) -> Result<(), String> {
    handle_result(wallpaper_engine_store.generate_by_album_id(album_id).await)
}

#[tauri::command]
pub async fn get_using_prompt(
    using_prompt_store: State<'_, using_prompt_manager::Store>,
) -> Result<Option<using_prompt_manager::UsingPrompt>, String> {
    let using_prompt = using_prompt_store.lock().await.get();

    Ok(using_prompt)
}

#[tauri::command]
pub async fn get_status(
    status_manager_store: State<'_, status_manager::Store>,
) -> Result<status_manager::Status, String> {
    let status = status_manager_store.lock().await.get();

    Ok(status)
}

#[tauri::command]
pub async fn cancel(
    wallpaper_engine_store: State<'_, AppWallpaperEngineStore>,
) -> Result<(), String> {
    wallpaper_engine_store.cancel().await;

    Ok(())
}
