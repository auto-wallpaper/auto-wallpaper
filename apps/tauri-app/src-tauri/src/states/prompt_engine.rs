use tokio::sync::Mutex;

use crate::libs::prompt_engine::PromptEngine;

pub struct PromptEngineStore {
    pub prompt_engine: Mutex<PromptEngine>,
}
