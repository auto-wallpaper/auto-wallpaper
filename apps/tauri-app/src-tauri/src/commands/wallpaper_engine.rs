use tauri::State;

use crate::{
    libs::wallpaper_engine::{
        managers::status::WallpaperEngineStatus,
        structs::{Prompt, WallpaperEngineError},
    },
    states::wallpaper_engine::{
        WallpaperEngineStatusStore, WallpaperEngineStore, WallpaperEngineUsingPromptStore,
    },
};

#[tauri::command]
pub async fn generate_selected_prompt(
    wallpaper_engine_store: State<'_, WallpaperEngineStore>,
) -> Result<(), String> {
    match wallpaper_engine_store
        .wallpaper_engine
        .lock()
        .await
        .generate_selected_prompt()
        .await
    {
        Ok(_) => {
            println!("mission completed!");
        }
        Err(error) => {
            match error {
                WallpaperEngineError::Canceled => println!("Wallpaper generation has been canceled"),
                WallpaperEngineError::MoreThanOneGenerationAtOnceError => println!("Wallpaper generation didn't start. Cannot generate more than 1 wallpaper at once"),
                _ => {
                    println!("Error: {:?}", error);
                    return Err(format!("{:?}", error));        
                }
            };
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn generate_by_prompt_id(
    wallpaper_engine_store: State<'_, WallpaperEngineStore>,
    prompt_id: String,
) -> Result<(), String> {
    match wallpaper_engine_store
        .wallpaper_engine
        .lock()
        .await
        .generate_by_prompt_id(&prompt_id)
        .await
    {
        Ok(_) => {
            println!("mission completed!");
        }
        Err(error) => {
            match error {
                    WallpaperEngineError::Canceled => println!("Wallpaper generation has been canceled"),
                    WallpaperEngineError::MoreThanOneGenerationAtOnceError => println!("Wallpaper generation didn't start. Cannot generate more than 1 wallpaper at once"),
                    _ => {
                        println!("Error: {:?}", error);
                        return Err(format!("{:?}", error));        
                    }
                };
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_using_prompt(
    wallpaper_engine_store: State<'_, WallpaperEngineUsingPromptStore>,
) -> Result<Option<Prompt>, String> {
    let using_prompt = wallpaper_engine_store.using_prompt.lock().await.get();

    Ok(using_prompt)
}

#[tauri::command]
pub async fn get_status(
    wallpaper_engine_store: State<'_, WallpaperEngineStatusStore>,
) -> Result<WallpaperEngineStatus, String> {
    let status = wallpaper_engine_store.status.lock().await.get();

    Ok(status)
}

#[tauri::command]
pub async fn cancel(
    wallpaper_engine_store: State<'_, WallpaperEngineStatusStore>,
) -> Result<(), String> {
    match wallpaper_engine_store
        .status
        .lock()
        .await
        .set(WallpaperEngineStatus::Canceling)
    {
        Ok(result) => Ok(result),
        Err(e) => {
            println!("Error: {:?}", e);
            Err(format!("{:?}", e))
        }
    }
}
