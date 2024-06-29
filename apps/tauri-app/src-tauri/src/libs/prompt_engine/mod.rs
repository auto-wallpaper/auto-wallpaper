use std::{collections::HashMap, time::Duration};
extern crate chrono;
extern crate chrono_tz;

use chrono::{DateTime, Timelike, Utc};
use chrono_tz::Tz;
use log::error;
use regex::Regex;
use reqwest::Client;
use serde::Deserialize;

use super::stores::user::UserRepository;

fn get_variables(prompt: &str) -> Vec<String> {
    let regex = Regex::new(r"\$([\w_]+)").expect("invalid regex");

    regex
        .find_iter(prompt)
        .filter_map(|value| {
            let mut name = value.as_str().to_string();

            name.remove(0);

            Some(name)
        })
        .collect()
}

fn replace(prompt: String, name: &str, value: &str) -> String {
    prompt.replace(&format!("${}", name), value)
}

#[derive(Debug)]
pub enum PromptEngineError {
    InvalidVariable(String),
}

struct PromptEngineCache {
    location_id: u64,
    created_at: i64,
    result: String,
}

pub struct PromptEngine {
    user_repository: UserRepository,
    cache: Option<PromptEngineCache>,
}

impl PromptEngine {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        Self {
            user_repository: UserRepository::open(app_handle),
            cache: None,
        }
    }

    pub fn validate(prompt: String) -> Result<(), PromptEngineError> {
        let variables: Vec<String> = get_variables(&prompt);

        for variable in variables {
            let upper_cased_variable = variable.to_uppercase();

            if !vec!["COUNTRY", "LOCATION_NAME", "DAY_TIME", "WEATHER"]
                .contains(&upper_cased_variable.as_str())
            {
                return Err(PromptEngineError::InvalidVariable(upper_cased_variable));
            }
        }

        Ok(())
    }

    pub async fn generate(&mut self, prompt: String) -> Result<String, PromptEngineError> {
        let variables: Vec<String> = get_variables(&prompt);

        let mut new_prompt = prompt.clone();

        for variable in variables {
            let upper_cased_variable = variable.to_uppercase();

            if upper_cased_variable == "COUNTRY" {
                new_prompt = replace(new_prompt, &variable, &self.handle_country());
                continue;
            }

            if upper_cased_variable == "LOCATION_NAME" {
                new_prompt = replace(new_prompt, &variable, &self.handle_location_name());
                continue;
            }

            if upper_cased_variable == "DAY_TIME" {
                new_prompt = replace(new_prompt, &variable, &self.handle_day_time());
                continue;
            }

            if upper_cased_variable == "WEATHER" {
                new_prompt = replace(new_prompt, &variable, &self.handle_weather().await);
                continue;
            }

            return Err(PromptEngineError::InvalidVariable(variable.to_uppercase()));
        }

        Ok(new_prompt)
    }

    fn handle_country(&self) -> String {
        let location = match self.user_repository.get_location() {
            Ok(location) => location,
            Err(_) => return "".to_string(),
        };

        location.country
    }

    fn handle_location_name(&self) -> String {
        let location = match self.user_repository.get_location() {
            Ok(location) => location,
            Err(_) => return "".to_string(),
        };

        location.name
    }

    fn handle_day_time(&self) -> String {
        let location = match self.user_repository.get_location() {
            Ok(location) => location,
            Err(_) => return "Afternoon".to_string(),
        };

        let mut time_map: HashMap<&str, Vec<u32>> = HashMap::new();

        time_map.insert("Midnight", vec![0, 6]);
        time_map.insert("Sunrise", vec![6, 8]);
        time_map.insert("Early Morning", vec![8, 11]);
        time_map.insert("Midday", vec![11, 14]);
        time_map.insert("Afternoon", vec![14, 16]);
        time_map.insert("Sunset", vec![16, 18]);
        time_map.insert("Evening", vec![18, 20]);
        time_map.insert("Night", vec![20, 24]);

        let tz: Tz = location.timezone.parse().unwrap();

        let now = &DateTime::from_timestamp_millis(Utc::now().timestamp_millis())
            .unwrap()
            .with_timezone(&tz);

        let hour = now.hour();

        for (name, range) in time_map.iter() {
            if hour >= range[0] && hour < range[1] {
                return name.to_string();
            }
        }

        return "Afternoon".to_string();
    }

    async fn handle_weather(&mut self) -> String {
        let location = match self.user_repository.get_location() {
            Ok(location) => location,
            Err(_) => return "".to_string(),
        };

        if let Some(cache) = &self.cache {
            if cache.location_id == location.id
                && cache.created_at + 60_000 < Utc::now().timestamp_millis()
            {
                return cache.result.clone();
            }
        }

        let mut code_map: HashMap<&str, &str> = HashMap::new();

        code_map.insert("0", "clear skies");
        code_map.insert("1", "mainly clear skies");
        code_map.insert("2", "partly cloudy skies");
        code_map.insert("3", "overcast skies");
        code_map.insert("45", "a blanket of fog");
        code_map.insert("48", "depositing rime fog");
        code_map.insert("51", "light drizzle");
        code_map.insert("53", "moderate drizzle");
        code_map.insert("55", "dense drizzle");
        code_map.insert("56", "light freezing drizzle");
        code_map.insert("57", "dense freezing drizzle");
        code_map.insert("61", "slight rain");
        code_map.insert("63", "moderate rain");
        code_map.insert("65", "heavy rain");
        code_map.insert("66", "light freezing rain");
        code_map.insert("67", "heavy freezing rain");
        code_map.insert("71", "slight snowfall");
        code_map.insert("73", "moderate snowfall");
        code_map.insert("75", "heavy snowfall");
        code_map.insert("77", "a flurry of snow grains");
        code_map.insert("80", "slight rain showers");
        code_map.insert("81", "moderate rain showers");
        code_map.insert("82", "violent rain showers");
        code_map.insert("85", "slight snow showers");
        code_map.insert("86", "heavy snow showers");
        code_map.insert("95", "a slight thunderstorm");
        code_map.insert("96", "a thunderstorm with slight hail");
        code_map.insert("99", "a thunderstorm with heavy hail");

        #[derive(Debug, Deserialize)]
        struct ResponseCurrent {
            weather_code: u32,
        }

        #[derive(Debug, Deserialize)]
        struct Response {
            current: ResponseCurrent,
        }

        let result = match Client::new()
            .get("https://api.open-meteo.com/v1/forecast")
            .query(&[
                ("latitude", location.latitude.to_string()),
                ("longitude", location.longitude.to_string()),
                ("current", "weather_code".to_string()),
            ])
            .timeout(Duration::from_secs(30))
            .send()
            .await
        {
            Ok(response) => match response.json::<Response>().await {
                Ok(v) => code_map
                    .get(v.current.weather_code.to_string().as_str())
                    .unwrap()
                    .to_string(),
                Err(e) => {
                    error!("Error during parsing the forecast payload: {:?}", e);

                    "".to_string()
                }
            },
            Err(e) => {
                error!("Error during forecast request: {:?}", e);

                "".to_string()
            }
        };

        self.cache = Some(PromptEngineCache {
            location_id: location.id,
            created_at: Utc::now().timestamp_millis(),
            result: result.clone(),
        });

        result
    }
}
