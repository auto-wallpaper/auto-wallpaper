use serde::Serialize;
use tauri::Manager;
use tokio::sync::Mutex;

#[derive(Debug, PartialEq, Clone, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Status {
    Idle,
    Initializing,
    Generating,
    Upscaling,
    Finalizing,
    Cancelling,
}

pub struct StatusManager {
    status: Status,
    app_handle: tauri::AppHandle,
}

impl StatusManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            status: Status::Idle,
            app_handle: app_handle.clone(),
        }
    }

    pub fn set(&mut self, status: Status) {
        #[derive(Debug, Clone, Serialize)]
        struct Payload {
            status: Status,
        }

        self.status = status.clone();

        let _ = self
            .app_handle
            .emit("wallpaper-engine-status-change", Payload { status });
    }

    pub fn get(&self) -> Status {
        self.status.clone()
    }
}

pub type Store = Mutex<StatusManager>;