import { BaseDirectory, exists, remove, mkdir, writeFile } from "@tauri-apps/plugin-fs"
import { appDataDir, join } from "@tauri-apps/api/path"

export const getWallpaperPathOf = async (promptId: string) => {
    const promptDir = await join(await appDataDir(), promptId)

    if (!await exists(promptDir)) {
        return null
    }

    const imagePath = await join(promptDir, "image.jpeg")

    if (await exists(imagePath)) {
        return imagePath
    }

    return null
}

export const removeWallpaperFiles = async (promptId: string) => {
    await remove(promptId, { baseDir: BaseDirectory.AppData, recursive: true })
}

export const saveWallpaperFiles = async ({ image, promptId }: { image: Uint8Array, promptId: string }) => {
    if (!await exists(promptId, { baseDir: BaseDirectory.AppData })) {
        await mkdir(promptId, {
            baseDir: BaseDirectory.AppData
        })
    }

    const imagePath = await join(promptId, "image.jpeg")

    return writeFile(imagePath, image, { baseDir: BaseDirectory.AppData })
}