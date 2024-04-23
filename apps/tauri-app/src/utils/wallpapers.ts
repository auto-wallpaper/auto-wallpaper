import { BaseDirectory, exists, remove, mkdir, writeFile } from "@tauri-apps/plugin-fs"
import { appDataDir, join } from "@tauri-apps/api/path"

export const getWallpaperPathOf = async (promptId: string) => {
    const promptDir = await join(await appDataDir(), promptId)

    if (!await exists(promptDir)) {
        return null
    }

    const upscalePath = await join(promptDir, "upscale.jpeg")

    if (await exists(upscalePath)) {
        return upscalePath
    }

    const originalPath = await join(promptDir, "original.jpeg")

    if (await exists(originalPath)) {
        return originalPath
    }

    return null
}

export const removeWallpaperFiles = async (promptId: string) => {
    await remove(promptId, { baseDir: BaseDirectory.AppData, recursive: true })
}

export const saveWallpaperFiles = async ({ upscaleImage, originalImage, promptId }: { upscaleImage: Uint8Array, originalImage: Uint8Array, promptId: string }) => {
    if (!await exists(promptId, { baseDir: BaseDirectory.AppData })) {
        await mkdir(promptId, {
            baseDir: BaseDirectory.AppData
        })
    }

    const upscalePath = await join(promptId, "upscale.jpeg")
    const originalPath = await join(promptId, "original.jpeg")

    await Promise.allSettled([
        writeFile(upscalePath, upscaleImage, { baseDir: BaseDirectory.AppData }),
        writeFile(originalPath, originalImage, { baseDir: BaseDirectory.AppData })
    ])
}