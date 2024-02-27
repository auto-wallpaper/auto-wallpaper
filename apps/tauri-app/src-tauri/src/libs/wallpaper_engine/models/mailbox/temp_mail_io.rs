use regex::Regex;
use reqwest::{Client, Error};
use serde::Deserialize;
use serde_json::json;

#[derive(Debug, Deserialize)]
struct MailboxResponse {
    email: String,
}

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

pub struct TempMailIo {
    client: Client,
    email: Option<String>,
}

impl TempMailIo {
    pub fn new() -> Result<Self, Error> {
        let client = Client::builder()
            .cookie_store(true)
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Self {
            client,
            email: None,
        })
    }

    pub fn get_email(&self) -> String {
        self.email.clone().unwrap()
    }

    pub async fn init(&mut self) -> Result<(), Error> {
        let response = self
            .client
            .post("https://api.internal.temp-mail.io/api/v3/email/new")
            .json(&json!({ "max_name_length": 10, "min_name_length": 10 }))
            .send()
            .await?;

        let data: MailboxResponse = response.json().await?;

        self.email = Some(data.email);

        Ok(())
    }

    async fn check_messages(&mut self) -> Result<Vec<Message>, Error> {
        let response = self
            .client
            .get(&format!(
                "https://api.internal.temp-mail.io/api/v3/email/{}/messages",
                self.get_email(),
            ))
            .send()
            .await?;

        let data: Vec<Message> = response.json().await?;

        Ok(data)
    }

    pub async fn lookup_confirmation_code(&mut self) -> Result<Option<String>, Error> {
        let messages = self.check_messages().await?;

        let first = match messages.get(0) {
            Some(message) => message,
            None => return Ok(None),
        };

        let code_regex = Regex::new(r"\d{6}").expect("invalid regex");

        Ok(Some(
            code_regex
                .find(&first.body_html)
                .unwrap()
                .as_str()
                .to_string(),
        ))
    }
}
