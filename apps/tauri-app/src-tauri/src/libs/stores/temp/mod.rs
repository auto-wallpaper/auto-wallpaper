use tauri::AppHandle;

use super::base::{Error, Result, Store};

pub struct TempRepository {
    store: Store,
}

impl TempRepository {
    pub fn open(app_handle: &AppHandle) -> Self {
        Self {
            store: Store::open(".temp.dat".into(), app_handle),
        }
    }

    pub fn get_last_active_track_event_day(&self) -> Result<u32> {
        let result = self
            .store
            .query(|store| Ok(store.get("lastActiveTrackEventDay".to_string()).cloned()))?;

        match result {
            Some(data) => Ok(serde_json::from_value::<u32>(data)?),
            None => Err(Error::ItemNotFound("lastActiveTrackEventDay".into())),
        }
    }

    pub fn set_last_active_track_event_day(&mut self, day: u32) -> Result<()> {
        let _ = self.store.mutate(|store| {
            store.insert("lastActiveTrackEventDay".into(), day.into())?;

            store.save()
        });

        Ok(())
    }
}
