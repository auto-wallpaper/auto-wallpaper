use std::{fmt::Debug, time::Duration};

use api::{GetAIGenerationFeedGenerationStatus, LeonardoApi};
use regex::Regex;
use tokio::time::sleep;

use crate::{libs::stores::user::PromptUpscale, utils::generate_string};

use super::email_providers::base::EmailProvider;

mod api;

#[derive(Debug)]
pub struct Generation {
    pub id: String,
    pub url: String,
}

const PASSWORD: &str = "abc123ABC!@#";

#[derive(Debug)]
pub enum Error {
    LeonardoApiError(api::Error),
    CreateAccountError,
    ConfirmationCodeError,
    UpdateUsernameError,
    AIGenerateTimeout,
}

impl From<api::Error> for Error {
    fn from(err: api::Error) -> Self {
        Error::LeonardoApiError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug)]
pub struct Leonardo<T: EmailProvider> {
    email_provider: T,
    api: LeonardoApi,
}

impl<T: EmailProvider> Leonardo<T> {
    pub fn new(email_provider: T) -> Self {
        Self {
            email_provider,
            api: LeonardoApi::new().expect("Could not construct LeonardoApi"),
        }
    }

    pub async fn signup(&mut self) -> Result<()> {
        for _ in 0..5 {
            self.email_provider.init().await;

            let email = self.email_provider.get_email();

            let response = self.api.signup(email, PASSWORD).await?;

            if response.code_delivery_details.is_none() {
                continue;
            }

            return Ok(());
        }

        return Err(Error::CreateAccountError);
    }

    pub async fn confirm_signup(&mut self) -> Result<()> {
        let mut code: Option<String> = None;

        for _ in 0..5 {
            sleep(Duration::from_secs(2)).await;

            code = Some(match self.email_provider.get_last_message_body().await {
                Ok(body) => match body {
                    Some(body) => {
                        let code_regex = Regex::new(r"\d{6}").expect("invalid regex");

                        code_regex.find(&body).unwrap().as_str().to_string()
                    }
                    None => continue,
                },
                Err(_) => continue,
            });
        }

        match code {
            Some(code) => {
                let email = self.email_provider.get_email();

                self.api.confirm_signup(email, PASSWORD, code).await?;

                Ok(())
            }
            None => Err(Error::ConfirmationCodeError),
        }
    }

    pub async fn login(&mut self) -> Result<()> {
        let email = self.email_provider.get_email();

        self.api.login(email, PASSWORD).await?;

        Ok(())
    }

    pub async fn update_username(&mut self) -> Result<()> {
        for i in 0..5 {
            sleep(Duration::from_secs(1)).await;

            match self.api.update_username(generate_string(15)).await {
                Ok(_) => {
                    return Ok(());
                }
                Err(e) => {
                    if i == 4 {
                        return Err(Error::LeonardoApiError(e));
                    }
                }
            };
        }

        Err(Error::UpdateUsernameError)
    }

    pub async fn update_user_details(&mut self) -> Result<()> {
        self.api.update_user_details().await?;

        Ok(())
    }

    pub async fn start_user_alchemy_trial(&mut self) -> Result<()> {
        self.api.start_user_alchemy_trial().await?;

        Ok(())
    }

    pub async fn create_sd_generation_job(
        &mut self,
        prompt: String,
        size_x: u32,
        size_y: u32,
    ) -> Result<String> {
        let generation_id = self
            .api
            .create_sd_generation_job(
                prompt,
                1,
                if size_x > size_y {
                    1536
                } else {
                    (size_x * 1536) / size_y
                },
                if size_y > size_x {
                    1536
                } else {
                    (size_y * 1536) / size_x
                },
            )
            .await?;

        Ok(generation_id)
    }

    pub async fn get_ai_generation_job(&mut self, generation_id: String) -> Result<Generation> {
        // waiting for 2 minutes
        for _ in 0..24 {
            sleep(Duration::from_secs(5)).await;

            let response = match self.api.get_ai_generation_job(generation_id.clone()).await {
                Ok(v) => v,
                Err(_) => continue,
            };

            let generated = match response.generations.get(0) {
                Some(v) => v,
                None => continue,
            };

            match generated.status {
                GetAIGenerationFeedGenerationStatus::COMPLETE => {
                    let generated_image = match generated.generated_images.get(0) {
                        Some(v) => v,
                        None => continue,
                    };

                    return Ok(Generation {
                        id: generated_image.id.clone(),
                        url: generated_image.url.clone(),
                    });
                }
                GetAIGenerationFeedGenerationStatus::FAILED => break,
                GetAIGenerationFeedGenerationStatus::PENDING => continue,
            }
        }

        return Err(Error::AIGenerateTimeout);
    }

    pub async fn upscale(
        &mut self,
        generated_image_id: String,
        upscale_settings: PromptUpscale,
    ) -> Result<String> {
        let generation_id = self
            .api
            .create_universal_upscaler_job(
                generated_image_id,
                upscale_settings.creativity_strength,
                upscale_settings.style,
            )
            .await?;

        return self.get_image_variation_by_fk(generation_id).await;
    }

    async fn get_image_variation_by_fk(&mut self, generation_id: String) -> Result<String> {
        // waiting for 2 minutes
        for _ in 0..24 {
            sleep(Duration::from_secs(5)).await;

            let data = self
                .api
                .get_image_variation_by_fk(generation_id.clone())
                .await?;

            match data.status {
                GetAIGenerationFeedGenerationStatus::COMPLETE => {
                    let url = match data.url {
                        Some(v) => v,
                        None => continue,
                    };

                    return Ok(url.clone());
                }
                GetAIGenerationFeedGenerationStatus::FAILED => continue,
                GetAIGenerationFeedGenerationStatus::PENDING => continue,
            }
        }

        return Err(Error::AIGenerateTimeout);
    }

    pub async fn delete_account(&mut self) -> Result<()> {
        self.api.delete_account().await?;

        Ok(())
    }
}
