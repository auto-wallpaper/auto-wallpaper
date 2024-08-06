use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::sync::broadcast;

pub struct CancellableFuture<F>
where
    F: Future,
{
    pub future: F,
    cancel_receiver: broadcast::Receiver<()>,
}

impl<F> CancellableFuture<F>
where
    F: Future,
{
    pub fn new(future: F, cancel_receiver: broadcast::Receiver<()>) -> Self {
        Self {
            future,
            cancel_receiver,
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum Error {
    Cancelled,
}

pub type Result<T> = std::result::Result<T, Error>;

impl<F> Future for CancellableFuture<F>
where
    F: Future + std::marker::Unpin,
{
    type Output = Result<F::Output>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();

        // Check for cancellation
        if this.cancel_receiver.try_recv().is_ok() {
            return Poll::Ready(Err(Error::Cancelled));
        }

        // Poll the inner future
        let future = unsafe { Pin::new_unchecked(&mut this.future) };
        match future.poll(cx) {
            Poll::Ready(output) => Poll::Ready(Ok(output)),
            Poll::Pending => Poll::Pending,
        }
    }
}
