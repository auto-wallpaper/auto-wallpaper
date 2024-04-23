use serde::Serialize;
use tauri::Manager;

#[derive(Debug, PartialEq, Serialize, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WallpaperEngineStatus {
    Initializing,
    GeneratingImage,
    Upscaling,
    Finalizing,
    Idle,
    Canceling,
}

pub struct WallpaperEngineStatusManager {
    status: WallpaperEngineStatus,
    app_handle: tauri::AppHandle,
}

impl WallpaperEngineStatusManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            status: WallpaperEngineStatus::Idle,
            app_handle: app_handle.clone(),
        }
    }

    pub fn set(&mut self, status: WallpaperEngineStatus) -> Result<(), tauri::Error> {
        self.status = status.clone();

        #[derive(Debug, Serialize, Clone)]
        struct StatusChangeEventPayload {
            status: WallpaperEngineStatus,
        }

        self.app_handle.emit(
            "wallpaper-engine-status-change",
            StatusChangeEventPayload { status },
        )?;

        Ok(())
    }

    pub fn get(&self) -> WallpaperEngineStatus {
        self.status.clone()
    }

    pub fn is_idle(&self) -> bool {
        self.status == WallpaperEngineStatus::Idle
    }

    pub fn is_canceling(&self) -> bool {
        self.status == WallpaperEngineStatus::Canceling
    }
}
