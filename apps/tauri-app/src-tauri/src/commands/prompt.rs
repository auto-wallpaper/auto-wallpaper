use tauri::State;

use crate::{
    libs::prompt_engine::{PromptEngine, PromptEngineError},
    states::prompt_engine::PromptEngineStore,
};

#[tauri::command]
pub async fn generate_prompt(
    prompt_engine_store: State<'_, PromptEngineStore>,
    prompt: String,
) -> Result<String, String> {
    match prompt_engine_store
        .prompt_engine
        .lock()
        .await
        .generate(prompt)
        .await
    {
        Ok(r) => Ok(r),
        Err(e) => match e {
            PromptEngineError::InvalidVariable(variable) => {
                Err(format!("invalid variable \"{}\"", variable))
            }
        },
    }
}

#[tauri::command]
pub fn validate_prompt(prompt: String) -> Result<(), String> {
    match PromptEngine::validate(prompt) {
        Ok(_) => Ok(()),
        Err(e) => match e {
            PromptEngineError::InvalidVariable(variable) => {
                Err(format!("invalid variable \"{}\"", variable))
            }
        },
    }
}
