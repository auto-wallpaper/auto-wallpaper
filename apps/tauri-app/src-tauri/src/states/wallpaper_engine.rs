use tokio::sync::Mutex;

use crate::libs::wallpaper_engine::{
    managers::{
        status::WallpaperEngineStatusManager, using_prompt::WallpaperEngineUsingPromptManager
    },
    WallpaperEngine,
};

pub struct WallpaperEngineStore {
    pub wallpaper_engine: Mutex<WallpaperEngine>,
}

pub struct WallpaperEngineStatusStore {
    pub status: Mutex<WallpaperEngineStatusManager>,
}

pub struct WallpaperEngineUsingPromptStore {
    pub using_prompt: Mutex<WallpaperEngineUsingPromptManager>,
}