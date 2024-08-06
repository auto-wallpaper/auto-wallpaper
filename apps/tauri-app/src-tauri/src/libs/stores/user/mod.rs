use std::cmp::Ordering;

use chrono::{
    format::{DelayedFormat, StrftimeItems},
    DateTime, Utc,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::AppHandle;

use super::base::{Error, Result, Store};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PromptUpscale {
    pub creativity_strength: u8,
    pub style: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: String,
    pub prompt: String,
    pub generated_at: Option<String>,
    pub upscale: Option<PromptUpscale>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SelectedPromptType {
    Prompt,
    Album,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedPrompt {
    pub id: String,
    #[serde(rename = "type")]
    pub prompt_type: SelectedPromptType,
}

#[derive(Debug, Deserialize)]
pub struct Location {
    pub id: u64,
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub timezone: String,
    pub country: String,
}

#[derive(Debug, Deserialize)]
pub struct ScreenSize {
    pub x: u32,
    pub y: u32,
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Interval {
    Off,
    FiveMins,
    TenMins,
    FifteenMins,
    Thirteens,
    OneHour,
    TwoHours,
    SixHours,
    TwelveHours,
    OneDay,
}

pub struct UserRepository {
    store: Store,
}

impl UserRepository {
    pub fn open(app_handle: &AppHandle) -> Self {
        Self {
            store: Store::open(".user.dat".into(), app_handle),
        }
    }

    pub fn get_selected_prompt(&self) -> Result<SelectedPrompt> {
        let result = self
            .store
            .run(|store| Ok(store.get("selectedPrompt".to_string()).cloned()))?;

        match result {
            Some(data) => Ok(serde_json::from_value::<SelectedPrompt>(data)?),
            None => Err(Error::ItemNotFound("selectedPrompt".into())),
        }
    }

    pub fn get_prompts(&self) -> Result<Vec<Prompt>> {
        let result = self
            .store
            .run(|store| Ok(store.get("prompts".to_string()).cloned()))?;

        match result {
            Some(data) => Ok(serde_json::from_value::<Vec<Prompt>>(data)?),
            None => Err(Error::ItemNotFound("prompts".into())),
        }
    }

    pub fn get_location(&self) -> Result<Location> {
        let result = self
            .store
            .run(|store| Ok(store.get("location".to_string()).cloned()))?;

        match result {
            Some(data) => Ok(serde_json::from_value::<Location>(data)?),
            None => Err(Error::ItemNotFound("location".into())),
        }
    }

    pub fn update_prompt_generated_at_field(
        &self,
        prompt_id: String,
    ) -> Result<DelayedFormat<StrftimeItems>> {
        let prompts = self.get_prompts()?;
        let now = Utc::now().format("%Y-%m-%dT%H:%M:%S.%fZ");

        let _ = self.store.run(|store| {
            store.insert(
                "prompts".into(),
                json!(prompts
                    .into_iter()
                    .map(|prompt| {
                        if prompt.id == prompt_id {
                            let mut clone = prompt.clone();

                            clone.generated_at = Some(now.to_string());

                            return clone;
                        }

                        prompt
                    })
                    .collect::<Vec<Prompt>>()),
            )?;

            store.save()
        });

        Ok(now)
    }

    pub fn get_interval(&self) -> Result<Interval> {
        let result = self
            .store
            .run(|store| Ok(store.get("interval".to_string()).cloned()))?;

        match result {
            Some(data) => Ok(serde_json::from_value::<Interval>(data)?),
            None => Err(Error::ItemNotFound("interval".into())),
        }
    }

    pub fn get_prompts_recently_generated_first(&self) -> Result<Vec<Prompt>> {
        let mut prompts = self.get_prompts()?;

        prompts.sort_by(|a, b| {
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

        Ok(prompts)
    }
}
