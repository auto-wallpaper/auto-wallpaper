use rand::Rng;
use reqwest::Client;
use std::path::PathBuf;

pub fn append_to_path(p: &PathBuf, s: &str) -> PathBuf {
    let mut p = p.clone().into_os_string();
    p.push(s);
    p.into()
}

pub fn generate_string(length: usize) -> String {
    let mut rng = rand::thread_rng();
    let chars = "abcdefghijklmnopqrstuvwxyz0123456789_";
    let string: String = (0..length)
        .map(|_| {
            let index = rng.gen_range(0..chars.len());
            chars.chars().nth(index).unwrap()
        })
        .collect();
    string
}

pub fn build_http_client() -> reqwest::Result<Client> {
    Client::builder()
        .cookie_store(true)
        .timeout(std::time::Duration::from_secs(30))
        .build()
}
