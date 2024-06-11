use std::cmp::Ordering;

use chrono::DateTime;
use serde::Deserialize;
use tauri::Manager;

use crate::{
    libs::wallpaper_engine::structs::{Album, Prompt},
    utils::append_to_path,
};

use super::store::StoreManager;

#[derive(Debug)]
pub enum DeviceWallpaperError {
    WallpaperNotFound,
    WallpaperChangeError,
    StorePluginError(tauri_plugin_store::Error),
}

impl From<tauri_plugin_store::Error> for DeviceWallpaperError {
    fn from(err: tauri_plugin_store::Error) -> Self {
        DeviceWallpaperError::StorePluginError(err)
    }
}

pub struct DeviceWallpaper {
    user_store: StoreManager,
    albums_store: StoreManager,
    app_handle: tauri::AppHandle,
}

impl DeviceWallpaper {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            user_store: StoreManager::make_user_store(app_handle),
            albums_store: StoreManager::make_albums_store(app_handle),
            app_handle: app_handle.clone(),
        }
    }

    pub fn change_wallpaper(&self, prompt_id: String) -> Result<(), DeviceWallpaperError> {
        let app_data_dir = self.app_handle.path().app_data_dir().unwrap();
        let prompt_dir = append_to_path(&app_data_dir, &format!("/{}", prompt_id));

        let upscale_image_path = append_to_path(&prompt_dir, "/upscale.jpeg");

        if upscale_image_path.exists() {
            return wallpaper::set_from_path(upscale_image_path.to_str().unwrap())
                .or(Err(DeviceWallpaperError::WallpaperChangeError));
        }

        let original_image_path = append_to_path(&prompt_dir, "/original.jpeg");

        if original_image_path.exists() {
            return wallpaper::set_from_path(original_image_path.to_str().unwrap())
                .or(Err(DeviceWallpaperError::WallpaperChangeError));
        }

        Err(DeviceWallpaperError::WallpaperNotFound)
    }

    pub fn refresh_wallpaper(&self) -> Result<(), DeviceWallpaperError> {
        #[derive(Deserialize, PartialEq)]
        #[serde(rename_all = "lowercase")]
        enum SelectedPromptTypes {
            Prompt,
            Album,
        }

        #[derive(Deserialize)]
        struct SelectedPrompt {
            id: String,
            #[serde(rename = "type")]
            prompt_type: SelectedPromptTypes,
        }

        let selected_prompt = self.user_store.get::<SelectedPrompt>("selectedPrompt")?;

        if selected_prompt.is_none() {
            return Ok(());
        }

        let selected_prompt = selected_prompt.unwrap();

        match selected_prompt.prompt_type {
            SelectedPromptTypes::Album => {
                let albums = self.albums_store.get::<Vec<Album>>("albums")?.unwrap();

                let filtered_albums: Vec<Album> = albums
                    .into_iter()
                    .filter(|album| album.id == selected_prompt.id)
                    .collect();

                let chosen_album = filtered_albums.get(0).unwrap();

                let prompts = self.user_store.get::<Vec<Prompt>>("prompts")?.unwrap();
                let mut prompts_of_album = prompts
                    .into_iter()
                    .filter(|prompt| chosen_album.prompts.contains(&prompt.id))
                    .collect::<Vec<Prompt>>();

                prompts_of_album.sort_by(|a, b| {
                    if a.generated_at.is_none() {
                        return Ordering::Greater;
                    };
                    if b.generated_at.is_none() {
                        return Ordering::Less;
                    };

                    let offset = DateTime::parse_from_rfc3339(&b.generated_at.clone().unwrap())
                        .unwrap()
                        .timestamp()
                        - DateTime::parse_from_rfc3339(&a.generated_at.clone().unwrap())
                            .unwrap()
                            .timestamp();

                    if offset == 0 {
                        return Ordering::Equal;
                    }

                    if offset > 0 {
                        return Ordering::Greater;
                    }

                    Ordering::Less
                });

                let chosen_prompt = prompts_of_album.get(0).unwrap();

                self.change_wallpaper(chosen_prompt.id.to_string())
            }
            SelectedPromptTypes::Prompt => self.change_wallpaper(selected_prompt.id),
        }
    }
}
