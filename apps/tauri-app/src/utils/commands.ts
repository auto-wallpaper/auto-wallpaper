import { invoke } from "@tauri-apps/api/tauri"

export const changeWallpaper = async ({ promptId }: { promptId: string }) => {
    await invoke("change_wallpaper", { promptId })
}