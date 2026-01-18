import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const update = await check();
    if (update) {
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}

export async function downloadAndInstall(
  onProgress?: (progress: UpdateProgress) => void
): Promise<boolean> {
  try {
    const update = await check();
    if (!update) return false;

    let downloaded = 0;
    let total = 0;

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0;
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        onProgress?.({ downloaded, total });
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to download and install update:', error);
    return false;
  }
}

export async function restartApp(): Promise<void> {
  await relaunch();
}
