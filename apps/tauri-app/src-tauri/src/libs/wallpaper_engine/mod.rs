use email_providers::base::EmailProvider;
use leonardo::{Generation, Leonardo};
use tokio::sync::broadcast;

use crate::libs::cancellable_future::CancellableFuture;

use super::{
    cancellable_future,
    stores::user::{Prompt, PromptUpscale},
};

pub mod email_providers;
pub mod leonardo;

#[derive(Debug)]
pub enum Error {
    LeonardoError(leonardo::Error),
    Cancelled,
    UnexpectedError,
}

impl From<leonardo::Error> for Error {
    fn from(err: leonardo::Error) -> Self {
        Error::LeonardoError(err)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

pub struct WallpaperEngine {
    cancel_receiver: broadcast::Receiver<()>,
    cancel_sender: broadcast::Sender<()>,
}

impl WallpaperEngine {
    pub fn new() -> Self {
        let (cancel_sender, cancel_receiver) = broadcast::channel(1);

        Self {
            cancel_receiver,
            cancel_sender,
        }
    }

    pub async fn setup_account<T: EmailProvider>(&self, leonardo: &mut Leonardo<T>) -> Result<()> {
        let cancel_receiver = self.cancel_receiver.resubscribe();

        let task = Box::pin(async move {
            leonardo.signup().await?;
            leonardo.confirm_signup().await?;
            leonardo.login().await?;
            leonardo.update_username().await?;
            leonardo.update_user_details().await?;
            leonardo.start_user_alchemy_trial().await?;

            Ok(())
        });

        WallpaperEngine::handle_error(CancellableFuture::new(task, cancel_receiver).await).await
    }

    pub async fn generate<T: EmailProvider>(
        &self,
        leonardo: &mut Leonardo<T>,
        prompt: Prompt,
        size_x: u32,
        size_y: u32,
    ) -> Result<Generation> {
        let cancel_receiver = self.cancel_receiver.resubscribe();

        let task = Box::pin(async move {
            let generation_id = leonardo
                .create_sd_generation_job(prompt.prompt, size_x, size_y)
                .await?;

            let generated_image = leonardo.get_ai_generation_job(generation_id).await?;

            Ok(generated_image)
        });

        WallpaperEngine::handle_error(CancellableFuture::new(task, cancel_receiver).await).await
    }

    pub async fn upscale<T: EmailProvider>(
        &self,
        leonardo: &mut Leonardo<T>,
        generated_image_id: String,
        upscale_settings: PromptUpscale,
    ) -> Result<String> {
        let cancel_receiver = self.cancel_receiver.resubscribe();

        let task = Box::pin(async move {
            let url = leonardo
                .upscale(generated_image_id, upscale_settings)
                .await?;

            Ok(url)
        });

        WallpaperEngine::handle_error(CancellableFuture::new(task, cancel_receiver).await).await
    }

    pub async fn destroy<T: EmailProvider>(&self, leonardo: &mut Leonardo<T>) -> Result<()> {
        let cancel_receiver = self.cancel_receiver.resubscribe();

        let task = Box::pin(async move {
            leonardo.delete_account().await?;

            Ok(())
        });

        WallpaperEngine::handle_error(CancellableFuture::new(task, cancel_receiver).await).await
    }

    pub fn cancel(&self) {
        let _ = self.cancel_sender.send(());
    }

    async fn handle_error<T>(
        cancellable_future_result: cancellable_future::Result<leonardo::Result<T>>,
    ) -> Result<T> {
        match cancellable_future_result {
            Ok(result) => match result {
                Ok(url) => Ok(url),
                Err(err) => Err(Error::LeonardoError(err)),
            },
            Err(e) if e == cancellable_future::Error::Cancelled => Err(Error::Cancelled),
            Err(_) => Err(Error::UnexpectedError),
        }
    }
}
