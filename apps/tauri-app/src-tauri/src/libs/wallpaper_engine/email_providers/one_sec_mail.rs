use rand::seq::SliceRandom;
use reqwest::Client;
use serde::Deserialize;
use uuid::Uuid;

use crate::utils::build_http_client;

use super::base::{EmailProvider, Result};
const DOMAINS: [&str; 2] = ["rteet.com", "dpptd.com"];

#[derive(Debug, Clone)]
pub struct OneSecMailProvider {
    client: Client,
    email: Option<String>,
    login: Option<String>,
    domain: Option<String>,
}

impl EmailProvider for OneSecMailProvider {
    fn new() -> Result<Self> {
        Ok(Self {
            client: build_http_client()?,
            email: None,
            login: None,
            domain: None,
        })
    }

    async fn init(&mut self) -> () {
        let domain = DOMAINS.choose(&mut rand::thread_rng()).unwrap().to_string();
        let login = Uuid::new_v4().to_string();

        self.email = Some(format!("{}@{}", &login, &domain));

        self.domain = Some(domain);
        self.login = Some(login);
    }

    fn get_email(&self) -> String {
        self.email.clone().unwrap()
    }

    async fn get_last_message_body(&self) -> Result<Option<String>> {
        #[derive(Debug, Deserialize)]
        struct MessageResponse {
            body: String,
        }

        #[derive(Debug, Deserialize)]
        struct Message {
            id: u32,
        }

        let response = self
            .client
            .get(format!(
                "https://www.1secmail.com/api/v1/?action=getMessages&login={}&domain={}",
                self.login.clone().unwrap(),
                self.domain.clone().unwrap(),
            ))
            .send()
            .await?
            .json::<Vec<Message>>()
            .await?;

        let last = match response.last() {
            Some(message) => message,
            None => return Ok(None),
        };

        let response = self
            .client
            .get(&format!(
                "https://www.1secmail.com/api/v1/?action=readMessage&login={}&domain={}&id={}",
                self.login.clone().unwrap(),
                self.domain.clone().unwrap(),
                last.id
            ))
            .send()
            .await?
            .json::<MessageResponse>()
            .await?;

        Ok(Some(response.body))
    }
}
