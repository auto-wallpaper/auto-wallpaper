import { invoke } from "@tauri-apps/api/core"

export const refreshWallpaper = async () => {
    await invoke("refresh_wallpaper")
}

export const generatePrompt = async (prompt: string): Promise<string> => {
    return await invoke("generate_prompt", { prompt })
}

export const validatePrompt = async (prompt: string): Promise<void> => {
    await invoke("validate_prompt", { prompt })
}