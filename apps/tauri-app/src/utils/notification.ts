import type { Options } from '@tauri-apps/api/notification';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

export const sendAppNotification = async (options: string | Options) => {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
        sendNotification(options);
    }
}