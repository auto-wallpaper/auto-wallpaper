use serde::Serialize;
use tauri::Manager;

use crate::libs::{
    stores::{self, user::UserRepository},
    wallpaper_engine::structs::UsingPrompt,
};

#[derive(Debug)]
pub enum WallpaperEngineUsingPromptError {
    RepositoryError(stores::base::Error),
    TauriError(tauri::Error),
    PromptNotFound,
}

impl From<tauri::Error> for WallpaperEngineUsingPromptError {
    fn from(err: tauri::Error) -> Self {
        WallpaperEngineUsingPromptError::TauriError(err)
    }
}

impl From<stores::base::Error> for WallpaperEngineUsingPromptError {
    fn from(err: stores::base::Error) -> Self {
        WallpaperEngineUsingPromptError::RepositoryError(err)
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
    user_repository: UserRepository,
}

impl WallpaperEngineUsingPromptManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            user_repository: UserRepository::open(app_handle),
            app_handle: app_handle.clone(),
            using_prompt: None,
        }
    }

    pub fn set(
        &mut self,
        prompt_id: &str,
        album_id: Option<String>,
    ) -> Result<UsingPrompt, WallpaperEngineUsingPromptError> {
        let prompts = self.user_repository.get_prompts()?;

        for prompt in prompts {
            if prompt.id == prompt_id {
                let using_prompt = UsingPrompt {
                    id: prompt.id,
                    prompt: prompt.prompt,
                    upscale: prompt.upscale,
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
