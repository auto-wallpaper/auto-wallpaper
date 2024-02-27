import type { BinaryFileContents } from "@tauri-apps/api/fs";
import { BaseDirectory, exists, removeDir, createDir, writeBinaryFile } from "@tauri-apps/api/fs"
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
    await removeDir(promptId, { dir: BaseDirectory.AppData, recursive: true })
}

export const saveWallpaperFiles = async ({ upscaleImage, originalImage, promptId }: { upscaleImage: BinaryFileContents, originalImage: BinaryFileContents, promptId: string }) => {
    if (!await exists(promptId, { dir: BaseDirectory.AppData })) {
        await createDir(promptId, {
            dir: BaseDirectory.AppData
        })
    }

    const upscalePath = await join(promptId, "upscale.jpeg")
    const originalPath = await join(promptId, "original.jpeg")

    await Promise.allSettled([
        writeBinaryFile(upscalePath, upscaleImage, { dir: BaseDirectory.AppData }),
        writeBinaryFile(originalPath, originalImage, { dir: BaseDirectory.AppData })
    ])
}