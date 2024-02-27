use regex::Regex;
use reqwest::cookie;
use reqwest::multipart::{Form, Part};
use reqwest::{header, Client};
use serde::Deserialize;
use tauri::utils::mime_type;

#[derive(Debug, Deserialize)]
struct UploadResponse {
    server_filename: String,
}

pub struct Upscale {
    client: Client,
    task: String,
    server_filename: Option<String>,
    filename: Option<String>,
}

impl Upscale {
    pub async fn new() -> Result<Self, reqwest::Error> {
        let client = Client::builder().build()?;

        let response = client
            .get("https://www.iloveimg.com/upscale-image")
            .send()
            .await?;
        let html = response.text().await?;

        let task_id_regex =
            Regex::new(r"ilovepdfConfig\.taskId = '([\w\d]*)'").expect("invalid regex");
        let token_regex = Regex::new(r#""token":"([\w\d._-]*)""#).expect("invalid regex");

        let task = task_id_regex
            .captures(&html)
            .unwrap()
            .get(1)
            .unwrap()
            .as_str();

        let token = token_regex
            .captures(&html)
            .unwrap()
            .get(1)
            .unwrap()
            .as_str();

        let cookie_store = cookie::Jar::default();
        let mut headers = header::HeaderMap::new();

        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(format!("Bearer {}", token).as_str()).unwrap(),
        );

        Ok(Self {
            client: Client::builder()
                .cookie_provider(cookie_store.into())
                .default_headers(headers)
                .build()?,
            task: task.to_string(),
            server_filename: None,
            filename: None,
        })
    }

    pub async fn upload(
        &mut self,
        file: Vec<u8>,
        filename: &'static str,
    ) -> Result<(), reqwest::Error> {
        let part = Part::bytes(file)
            .file_name(filename)
            .mime_str(&mime_type::MimeType::parse_from_uri(filename).to_string())
            .unwrap();

        let form = Form::new()
            .part("file", part)
            .text("name", filename)
            .text("task", self.task.clone());

        let response = self
            .client
            .post("https://api3g.iloveimg.com/v1/upload")
            .multipart(form)
            .send()
            .await?;

        let data: UploadResponse = response.json().await?;
        self.server_filename = Some(data.server_filename);
        self.filename = Some(filename.to_string());

        Ok(())
    }

    pub async fn upscale(&mut self) -> Result<(), reqwest::Error> {
        let form = Form::new()
            .text("task", self.task.clone())
            .text("server_filename", self.server_filename.clone().unwrap())
            .text("scale", "4");

        self.client
            .post("https://api3g.iloveimg.com/v1/upscale")
            .multipart(form)
            .send()
            .await?;

        Ok(())
    }

    pub async fn process(&mut self) -> Result<(), reqwest::Error> {
        let form = Form::new()
            .text("packaged_filename", "iloveimg-upscaled")
            .text("multiplier", "4")
            .text("task", self.task.clone())
            .text("tool", "upscaleimage")
            .text(
                "files[0][server_filename]",
                self.server_filename.clone().unwrap(),
            )
            .text("files[0][filename]", self.filename.clone().unwrap());

        self.client
            .post("https://api3g.iloveimg.com/v1/process")
            .multipart(form)
            .send()
            .await?;

        Ok(())
    }

    pub async fn download(&mut self) -> Result<Vec<u8>, reqwest::Error> {
        let url = format!(
            "https://api3g.iloveimg.com/v1/download/{}",
            self.task.clone()
        );
        let response = self.client.get(url).send().await?;
        let data = response.bytes().await?;

        Ok(data.to_vec())
    }
}
