use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_store::{with_store, StoreCollection};

pub struct Store {
    path: String,
    app_handle: AppHandle,
}

impl Store {
    pub fn open(path: String, app_handle: &AppHandle) -> Self {
        Self {
            path,
            app_handle: app_handle.clone(),
        }
    }

    pub fn run<
        T,
        F: FnOnce(&mut tauri_plugin_store::Store<tauri::Wry>) -> tauri_plugin_store::Result<T>,
    >(
        &self,
        f: F,
    ) -> tauri_plugin_store::Result<T> {
        let stores = self.app_handle.state::<StoreCollection<Wry>>();

        with_store(self.app_handle.clone(), stores, self.path.clone(), f)
    }
}

#[derive(Debug)]
pub enum Error {
    Store(tauri_plugin_store::Error),
    SerdeJson(serde_json::Error),
    ItemNotFound(String),
}

impl From<tauri_plugin_store::Error> for Error {
    fn from(err: tauri_plugin_store::Error) -> Self {
        Error::Store(err)
    }
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::SerdeJson(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
