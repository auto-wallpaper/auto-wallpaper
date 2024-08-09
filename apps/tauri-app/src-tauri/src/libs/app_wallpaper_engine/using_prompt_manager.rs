use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::sync::Mutex;

use crate::libs::stores::user::{Prompt, PromptUpscale};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UsingPrompt {
    pub id: String,
    pub prompt: String,
    pub upscale: Option<PromptUpscale>,
    pub album_id: Option<String>,
    pub generated_at: Option<String>,
    pub created_at: String,
}

impl From<Prompt> for UsingPrompt {
    fn from(prompt: Prompt) -> Self {
        Self {
            id: prompt.id,
            prompt: prompt.prompt,
            upscale: prompt.upscale,
            album_id: None,
            generated_at: prompt.generated_at,
            created_at: prompt.created_at,
        }
    }
}

pub struct UsingPromptManager {
    using_prompt: Option<UsingPrompt>,
    app_handle: tauri::AppHandle,
}

impl UsingPromptManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            using_prompt: None,
            app_handle: app_handle.clone(),
        }
    }

    pub fn set(&mut self, using_prompt: Option<UsingPrompt>) {
        #[derive(Debug, Clone, Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Payload {
            using_prompt: Option<UsingPrompt>,
        }

        self.using_prompt = using_prompt.clone();

        let _ = self.app_handle.emit(
            "wallpaper-engine-using-prompt-change",
            Payload { using_prompt },
        );
    }

    pub fn get(&self) -> Option<UsingPrompt> {
        self.using_prompt.clone()
    }
}

pub type Store = Mutex<UsingPromptManager>;
