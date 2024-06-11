use serde::Serialize;
use tauri::Manager;

use crate::libs::{
    store::StoreManager,
    wallpaper_engine::structs::{Prompt, UsingPrompt},
};

#[derive(Debug)]
pub enum WallpaperEngineUsingPromptError {
    TauriPluginStore(tauri_plugin_store::Error),
    TauriError(tauri::Error),
    PromptNotFound,
}

impl From<tauri_plugin_store::Error> for WallpaperEngineUsingPromptError {
    fn from(err: tauri_plugin_store::Error) -> Self {
        WallpaperEngineUsingPromptError::TauriPluginStore(err)
    }
}

impl From<tauri::Error> for WallpaperEngineUsingPromptError {
    fn from(err: tauri::Error) -> Self {
        WallpaperEngineUsingPromptError::TauriError(err)
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UsingPromptChangeEventPayload {
    using_prompt: Option<UsingPrompt>,
}

pub struct WallpaperEngineUsingPromptManager {
    app_handle: tauri::AppHandle,
    using_prompt: Option<UsingPrompt>,
    user_store: StoreManager,
}

impl WallpaperEngineUsingPromptManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            user_store: StoreManager::make_user_store(app_handle),
            app_handle: app_handle.clone(),
            using_prompt: None,
        }
    }

    pub fn set(
        &mut self,
        prompt_id: &str,
        album_id: Option<String>,
    ) -> Result<UsingPrompt, WallpaperEngineUsingPromptError> {
        let prompts = self.user_store.get::<Vec<Prompt>>("prompts")?.unwrap();

        for prompt in prompts {
            if prompt.id == prompt_id {
                let using_prompt = UsingPrompt {
                    id: prompt.id,
                    prompt: prompt.prompt,
                    album_id,
                    generated_at: prompt.generated_at,
                    created_at: prompt.created_at,
                };

                self.using_prompt = Some(using_prompt.clone());

                self.app_handle.emit(
                    "wallpaper-engine-using-prompt-change",
                    UsingPromptChangeEventPayload {
                        using_prompt: Some(using_prompt.clone()),
                    },
                )?;

                return Ok(using_prompt);
            }
        }

        Err(WallpaperEngineUsingPromptError::PromptNotFound)
    }

    pub fn clear(&mut self) -> Result<(), tauri::Error> {
        self.using_prompt = None;

        self.app_handle.emit(
            "wallpaper-engine-using-prompt-change",
            UsingPromptChangeEventPayload { using_prompt: None },
        )?;

        Ok(())
    }

    pub fn get(&self) -> Option<UsingPrompt> {
        self.using_prompt.clone()
    }
}
