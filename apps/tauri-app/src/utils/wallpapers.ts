import { BaseDirectory, exists, readBinaryFile, removeDir, createDir, writeBinaryFile } from "@tauri-apps/api/fs"
import { join } from "@tauri-apps/api/path"

export const getWallpaperOf = async (promptId: string) => {
    if (!await exists(promptId, { dir: BaseDirectory.AppData })) {
        return null
    }

    const upscalePath = await join(promptId, "upscale.jpeg")

    if (await exists(promptId, { dir: BaseDirectory.AppData })) {
        return readBinaryFile(upscalePath, { dir: BaseDirectory.AppData })
    }

    const wallpaperPath = await join(promptId, "original.jpeg")

    if (await exists(promptId, { dir: BaseDirectory.AppData })) {
        return readBinaryFile(wallpaperPath, { dir: BaseDirectory.AppData })
    }
}

export const removeWallpaperFiles = async (promptId: string) => {
    await removeDir(promptId, { dir: BaseDirectory.AppData, recursive: true })
}

export const saveWallpaperFiles = async ({ upscaleImage, originalImage, promptId }: { upscaleImage: Uint8Array, originalImage: Uint8Array, promptId: string }) => {
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