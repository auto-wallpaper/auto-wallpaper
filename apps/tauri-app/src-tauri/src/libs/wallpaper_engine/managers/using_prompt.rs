use serde::Serialize;
use tauri::Manager;

use crate::libs::{store::StoreManager, wallpaper_engine::structs::Prompt};

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
    using_prompt: Option<Prompt>,
}

pub struct WallpaperEngineUsingPromptManager {
    app_handle: tauri::AppHandle,
    using_prompt: Option<Prompt>,
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

    pub fn set(&mut self, prompt_id: &str) -> Result<Prompt, WallpaperEngineUsingPromptError> {
        let prompts = self.user_store.get::<Vec<Prompt>>("prompts")?.unwrap();

        for prompt in prompts {
            if prompt.id == prompt_id {
                self.using_prompt = Some(prompt.clone());

                self.app_handle.emit(
                    "wallpaper-engine-using-prompt-change",
                    UsingPromptChangeEventPayload {
                        using_prompt: Some(prompt.clone()),
                    },
                )?;

                return Ok(prompt);
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

    pub fn get(&self) -> Option<Prompt> {
        self.using_prompt.clone()
    }
}
