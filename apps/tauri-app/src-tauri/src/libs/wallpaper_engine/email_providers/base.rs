use std::fmt::Debug;

#[derive(Debug)]
pub enum Error {
    HttpError(reqwest::Error),
}

impl From<reqwest::Error> for Error {
    fn from(err: reqwest::Error) -> Self {
        Error::HttpError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

pub trait EmailProvider {
    fn new() -> Result<Self>
    where
        Self: Sized + Debug + Clone;
    async fn init(&mut self) -> ();
    fn get_email(&self) -> String;
    async fn get_last_message_body(&self) -> Result<Option<String>>;
}