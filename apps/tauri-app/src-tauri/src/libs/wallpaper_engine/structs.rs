use std::io;

use serde::{Deserialize, Serialize};

use crate::libs::{
    device_wallpaper::DeviceWallpaperError, prompt_engine::PromptEngineError, stores::{self, user::PromptUpscale},
};

use super::{
    managers::using_prompt::WallpaperEngineUsingPromptError, models::leonardo::GraphqlRequestError,
};

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

pub struct AIGenerationData {
    pub url: String,
    pub id: String,
}

#[derive(Debug)]
pub enum WallpaperEngineError {
    UsingPromptError(WallpaperEngineUsingPromptError),
    Canceled,
    MoreThanOneGenerationAtOnceError,
    ConfirmationCodeError,
    SignupError,
    UpdateUsernameError,
    AIGenerateTimeout,
    UnexpectedError,
    PromptEngineError(PromptEngineError),
    DeviceWallpaperError(DeviceWallpaperError),
    GraphQLError(GraphqlRequestError),
    NetworkError(reqwest::Error),
    IoError(io::Error),
    StorePluginError(tauri_plugin_store::Error),
    RepositoryError(stores::base::Error),
    TauriError(tauri::Error),
}

impl From<reqwest::Error> for WallpaperEngineError {
    fn from(err: reqwest::Error) -> Self {
        WallpaperEngineError::NetworkError(err)
    }
}

impl From<GraphqlRequestError> for WallpaperEngineError {
    fn from(err: GraphqlRequestError) -> Self {
        WallpaperEngineError::GraphQLError(err)
    }
}

impl From<io::Error> for WallpaperEngineError {
    fn from(err: io::Error) -> Self {
        WallpaperEngineError::IoError(err)
    }
}

impl From<tauri::Error> for WallpaperEngineError {
    fn from(err: tauri::Error) -> Self {
        WallpaperEngineError::TauriError(err)
    }
}

impl From<WallpaperEngineUsingPromptError> for WallpaperEngineError {
    fn from(err: WallpaperEngineUsingPromptError) -> Self {
        WallpaperEngineError::UsingPromptError(err)
    }
}

impl From<DeviceWallpaperError> for WallpaperEngineError {
    fn from(err: DeviceWallpaperError) -> Self {
        WallpaperEngineError::DeviceWallpaperError(err)
    }
}

impl From<tauri_plugin_store::Error> for WallpaperEngineError {
    fn from(err: tauri_plugin_store::Error) -> Self {
        WallpaperEngineError::StorePluginError(err)
    }
}

impl From<stores::base::Error> for WallpaperEngineError {
    fn from(err: stores::base::Error) -> Self {
        WallpaperEngineError::RepositoryError(err)
    }
}

impl From<PromptEngineError> for WallpaperEngineError {
    fn from(err: PromptEngineError) -> Self {
        WallpaperEngineError::PromptEngineError(err)
    }
}
