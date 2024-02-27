import { invoke } from "@tauri-apps/api/tauri"

export const refreshWallpaper = async () => {
    await invoke("refresh_wallpaper")
}