use rand::seq::SliceRandom;
use regex::Regex;
use reqwest::{Client, Error};
use serde::Deserialize;
use uuid::Uuid;

const DOMAINS: [&str; 2] = ["rteet.com", "dpptd.com"];

pub struct OneSecmail {
    client: Client,
    email: Option<String>,
    login: Option<String>,
    domain: Option<String>,
}

impl OneSecmail {
    pub fn new() -> Result<Self, Error> {
        let client = Client::builder()
            .cookie_store(true)
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Self {
            client,
            email: None,
            login: None,
            domain: None,
        })
    }

    pub fn get_email(&self) -> String {
        self.email.clone().unwrap()
    }

    pub async fn init(&mut self) -> Result<(), Error> {
        let domain = DOMAINS.choose(&mut rand::thread_rng()).unwrap().to_string();
        let login = Uuid::new_v4().to_string();

        self.email = Some(format!("{}@{}", &login, &domain));

        self.domain = Some(domain);
        self.login = Some(login);

        Ok(())
    }

    async fn get_last_message_id(&mut self) -> Result<Option<u32>, Error> {
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

        let last = match response.get(0) {
            Some(message) => message,
            None => return Ok(None),
        };

        Ok(Some(last.id.clone()))
    }

    pub async fn lookup_confirmation_code(&mut self) -> Result<Option<String>, Error> {
        #[derive(Debug, Deserialize)]
        struct MessageResponse {
            #[serde(rename = "body")]
            body: String,
        }

        let message_id = match self.get_last_message_id().await? {
            Some(id) => id,
            None => return Ok(None),
        };

        let response = self
            .client
            .get(&format!(
                "https://www.1secmail.com/api/v1/?action=readMessage&login={}&domain={}&id={}",
                self.login.clone().unwrap(),
                self.domain.clone().unwrap(),
                message_id
            ))
            .send()
            .await?
            .json::<MessageResponse>()
            .await?;

        let code_regex = Regex::new(r"\d{6}").expect("invalid regex");

        Ok(Some(
            code_regex
                .find(&response.body)
                .unwrap()
                .as_str()
                .to_string(),
        ))
    }
}
