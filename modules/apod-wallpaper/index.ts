import { requireOptionalNativeModule } from 'expo-modules-core';

export type WallpaperTarget = 'home' | 'lock' | 'both';

// Optional so importing on a platform without the native module (e.g. Expo Go or
// iOS) yields null instead of throwing at load. The app builds for Android, where
// the module is present.
const ApodWallpaper = requireOptionalNativeModule<{
  setWallpaper(uri: string, target: WallpaperTarget): Promise<void>;
}>('ApodWallpaper');

/** Whether the native wallpaper module is available in this build. */
export const isWallpaperSupported = ApodWallpaper != null;

/**
 * Sets the device wallpaper directly from a local image file (file:// URI),
 * applying it to the home screen, the lock screen, or both. Rejects with a
 * user-safe message if the native module is unavailable or the set fails.
 */
export async function setWallpaper(uri: string, target: WallpaperTarget): Promise<void> {
  if (!ApodWallpaper) {
    throw new Error('Setting wallpaper needs a full app build.');
  }
  await ApodWallpaper.setWallpaper(uri, target);
}
