use tauri::State;

use crate::{
    libs::app_wallpaper_engine::{handle_result, status_manager, using_prompt_manager},
    states::wallpaper_engine::AppWallpaperEngineStore,
};

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
