use std::path::PathBuf;

use serde::de::DeserializeOwned;
use tauri::{Manager, Wry};
use tauri_plugin_store::{with_store, StoreCollection};

pub struct StoreManager {
    app_handle: tauri::AppHandle,
    path: PathBuf,
}

impl StoreManager {
    pub fn make_user_store(app_handle: tauri::AppHandle) -> Self {
        StoreManager::new(app_handle, ".user.dat")
    }

    pub fn make_temp_store(app_handle: tauri::AppHandle) -> Self {
        StoreManager::new(app_handle, ".temp.dat")
    }

    pub fn new(app_handle: tauri::AppHandle, path: &str) -> Self {
        Self {
            app_handle,
            path: PathBuf::from(path),
        }
    }
    
    pub fn get<T: DeserializeOwned>(
        &self,
        key: &str,
    ) -> Result<Option<T>, tauri_plugin_store::Error> {
        let stores = self.app_handle.state::<StoreCollection<Wry>>();

        with_store(
            self.app_handle.clone(),
            stores,
            self.path.clone(),
            |store| match store.get(key) {
                Some(v) => Ok(Some(serde_json::from_value::<T>(v.clone())?)),
                None => Ok(None),
            },
        )
    }

    pub fn set(
        &mut self,
        key: &str,
        value: serde_json::Value,
    ) -> Result<(), tauri_plugin_store::Error> {
        let stores = self.app_handle.state::<StoreCollection<Wry>>();

        with_store(
            self.app_handle.clone(),
            stores,
            self.path.clone(),
            |store| {
                store.insert(key.to_string(), value)?;
                store.save()
            },
        )
    }
}
