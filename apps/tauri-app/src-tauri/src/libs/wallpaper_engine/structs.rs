use std::io;

use rimage::image::ImageError;
use serde::{Deserialize, Serialize};

use crate::libs::{device_wallpaper::DeviceWallpaperError, prompt_engine::PromptEngineError};

use super::{
    managers::using_prompt::WallpaperEngineUsingPromptError, models::leonardo::GraphqlRequestError,
};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: String,
    pub prompt: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ScreenSize {
    pub x: u32,
    pub y: u32,
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
    TauriError(tauri::Error),
    OptimizationError(ImageError),
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

impl From<PromptEngineError> for WallpaperEngineError {
    fn from(err: PromptEngineError) -> Self {
        WallpaperEngineError::PromptEngineError(err)
    }
}

impl From<ImageError> for WallpaperEngineError {
    fn from(err: ImageError) -> Self {
        WallpaperEngineError::OptimizationError(err)
    }
}
