use rand::prelude::SliceRandom;
use std::cmp::Ordering;

use chrono::DateTime;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::{
    base::{Error, Result, Store},
    user::{Prompt, UserRepository},
};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum AlbumSelectionType {
    Sequential,
    Random,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Album {
    pub id: String,
    pub prompts: Vec<String>,
    pub selection_type: AlbumSelectionType,
}

pub struct AlbumsRepository {
    store: Store,
    user_repository: UserRepository,
}

impl AlbumsRepository {
    pub fn open(app_handle: &AppHandle) -> Self {
        Self {
            store: Store::open(".albums.dat".into(), app_handle),
            user_repository: UserRepository::open(app_handle),
        }
    }

    fn get_albums(&self) -> Result<Vec<Album>> {
        let result = self
            .store
            .query(|store| Ok(store.get("albums".to_string()).cloned()))?;

        match result {
            Some(data) => Ok(serde_json::from_value::<Vec<Album>>(data)?),
            None => Err(Error::ItemNotFound("albums".into())),
        }
    }

    pub fn get_album_by_id(&self, album_id: String) -> Result<Album> {
        let albums = self.get_albums()?;

        let filtered_albums: Vec<Album> = albums
            .into_iter()
            .filter(|album| album.id == album_id)
            .collect();

        let album = filtered_albums.get(0).cloned();
        match album {
            Some(album) => Ok(album),
            None => Err(Error::ItemNotFound("album with this id not found".into())),
        }
    }

    fn get_prompts(&self, album_id: String) -> Result<Vec<Prompt>> {
        let chosen_album = self.get_album_by_id(album_id)?;

        let prompts = self.user_repository.get_prompts()?;

        let prompts_of_album = prompts
            .into_iter()
            .filter(|prompt| chosen_album.prompts.contains(&prompt.id))
            .collect::<Vec<Prompt>>();

        Ok(prompts_of_album)
    }

    pub fn get_prompts_recently_generated_first(&self, album_id: String) -> Result<Vec<Prompt>> {
        let mut prompts = self.get_prompts(album_id)?;

        prompts.sort_by(|a, b| {
            if a.generated_at.is_none() {
                return Ordering::Less;
            };
            if b.generated_at.is_none() {
                return Ordering::Greater;
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
                return Ordering::Less;
            }

            Ordering::Greater
        });

        Ok(prompts)
    }

    pub fn get_the_chosen_prompt_of_album(&self, album_id: String) -> Result<String> {
        let chosen_album = self.get_album_by_id(album_id)?;

        let chosen_prompt_id = match chosen_album.selection_type {
            AlbumSelectionType::Random => chosen_album
                .prompts
                .choose(&mut rand::thread_rng())
                .unwrap()
                .clone(),
            AlbumSelectionType::Sequential => {
                let prompts = self.user_repository.get_prompts()?;

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

                let most_recent_generated_prompt = prompts_of_album.get(0).unwrap();

                let index = if let Some(index) = chosen_album
                    .prompts
                    .clone()
                    .into_iter()
                    .position(|prompt| prompt == most_recent_generated_prompt.id)
                {
                    if index + 1 < chosen_album.prompts.len() {
                        index + 1
                    } else {
                        0
                    }
                } else {
                    0
                };

                chosen_album.prompts[index].clone()
            }
        };

        Ok(chosen_prompt_id)
    }
}
