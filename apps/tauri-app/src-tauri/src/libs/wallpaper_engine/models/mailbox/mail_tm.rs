use regex::Regex;
use reqwest::{header, Client, Error};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct Message {
    pub id: String,
    pub from: String,
    pub to: String,
    pub subject: String,
    pub body_text: String,
    pub body_html: String,
    pub created_at: String,
}

const PASSWORD: &str = "abcABC123!@#";

pub struct MailTm {
    client: Client,
    email: Option<String>,
    token: Option<String>,
}

impl MailTm {
    pub fn new() -> Result<Self, Error> {
        let client = Client::builder()
            .cookie_store(true)
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Self {
            client,
            email: None,
            token: None,
        })
    }

    pub fn get_email(&self) -> String {
        self.email.clone().unwrap()
    }

    async fn get_first_domain(&mut self) -> Result<Option<String>, Error> {
        #[derive(Debug, Deserialize)]
        struct Domain {
            domain: String,
        }

        #[derive(Debug, Deserialize)]
        struct DomainsResponse {
            #[serde(rename = "hydra:member")]
            hydra_member: Vec<Domain>,
        }

        let response = self
            .client
            .get("https://api.mail.tm/domains")
            .send()
            .await?;

        let domains: DomainsResponse = response.json().await?;
        Ok(match domains.hydra_member.first() {
            Some(domain) => Some(domain.domain.clone()),
            None => None,
        })
    }

    pub async fn init(&mut self) -> Result<(), Error> {
        let first_domain = self.get_first_domain().await?.unwrap();

        for _ in 0..3 {
            let email_address = format!("{}@{}", Uuid::new_v4(), first_domain);

            match self
                .client
                .post("https://api.mail.tm/accounts")
                .json(&json!({
                    "address": email_address,
                    "password": PASSWORD,
                }))
                .send()
                .await
            {
                Ok(_) => (),
                Err(_) => continue,
            };

            #[derive(Debug, Deserialize)]
            struct TokenResponse {
                token: String,
            }

            let token_response = match self
                .client
                .post("https://api.mail.tm/token")
                .json(&json!({
                    "address": email_address,
                    "password": PASSWORD,
                }))
                .send()
                .await?
                .json::<TokenResponse>()
                .await
            {
                Ok(resp) => resp,
                Err(_) => continue,
            };

            self.email = Some(email_address);
            self.token = Some(token_response.token);

            return Ok(());
        }

        Ok(())
    }

    async fn get_first_message_id(&mut self) -> Result<Option<String>, Error> {
        #[derive(Debug, Deserialize)]
        struct Message {
            #[serde(rename = "@id")]
            id: String,
        }

        #[derive(Debug, Deserialize)]
        struct MessagesResponse {
            #[serde(rename = "hydra:member")]
            hydra_member: Vec<Message>,
        }

        let response = self
            .client
            .get("https://api.mail.tm/messages")
            .header(
                header::AUTHORIZATION,
                format!("Bearer {}", self.token.clone().unwrap()),
            )
            .send()
            .await?
            .json::<MessagesResponse>()
            .await?;

        let first = match response.hydra_member.get(0) {
            Some(message) => message,
            None => return Ok(None),
        };

        Ok(Some(first.id.clone()))
    }

    pub async fn lookup_confirmation_code(&mut self) -> Result<Option<String>, Error> {
        #[derive(Debug, Deserialize)]
        struct MessageResponse {
            html: Vec<String>,
        }

        let message_id = match self.get_first_message_id().await? {
            Some(id) => id,
            None => return Ok(None),
        };

        let response = self
            .client
            .get(&format!("https://api.mail.tm{}", message_id))
            .header(
                header::AUTHORIZATION,
                format!("Bearer {}", self.token.clone().unwrap()),
            )
            .send()
            .await?
            .json::<MessageResponse>()
            .await?;

        let code_regex = Regex::new(r"\d{6}").expect("invalid regex");

        let first_html_node = match response.html.get(0) {
            Some(value) => value,
            None => return Ok(None),
        };

        Ok(Some(
            code_regex
                .find(first_html_node)
                .unwrap()
                .as_str()
                .to_string(),
        ))
    }
}
