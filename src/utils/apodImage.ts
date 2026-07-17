import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { Apod } from '../types/apod';
import { setWallpaper, WallpaperTarget } from '../../modules/apod-wallpaper';

function imageUrlFor(apod: Apod): string {
  const url = apod.hdImageUrl || apod.imageUrl;
  if (!url) throw new Error('This picture has no downloadable image.');
  return url;
}

/** Downloads the HD image (falling back to the standard one) into the cache directory. */
export async function downloadApodImage(apod: Apod): Promise<File> {
  const url = imageUrlFor(apod);
  const dir = new Directory(Paths.cache, 'apod');
  try {
    // `Directory.create()` is synchronous and can throw (e.g. if the cache
    // directory is missing or unwritable), so it must stay inside this guard.
    if (!dir.exists) dir.create();
    // `idempotent: true` lets a second tap re-download over the same cached
    // file instead of rejecting with `DestinationAlreadyExists`.
    return await File.downloadFileAsync(url, dir, { idempotent: true });
  } catch {
    throw new Error('Could not download the image. Check your connection.');
  }
}

/** Saves the APOD image into the device gallery. */
export async function saveApodToGallery(apod: Apod): Promise<void> {
  const file = await downloadApodImage(apod);
  // requestPermissionsAsync(writeOnly?, granularPermissions?) takes positional
  // arguments in this SDK, not an options object.
  let perm;
  try {
    perm = await requestPermissionsAsync(false, ['photo']);
  } catch {
    throw new Error('Could not save the image to your gallery.');
  }
  if (!perm.granted) throw new Error('Gallery permission denied.');
  try {
    await Asset.create(file.uri);
  } catch {
    throw new Error('Could not save the image to your gallery.');
  }
}

/**
 * Sets the APOD image as the wallpaper on the home screen, lock screen, or both.
 *
 * Uses the local `apod-wallpaper` native module (WallpaperManager.setStream)
 * rather than an ACTION_ATTACH_DATA intent: MIUI's wallpaper cropper cannot read
 * our granted content URI across processes and fails with "could not load data",
 * so we read the file and set it ourselves. Applied without a crop step.
 */
export async function setApodAsWallpaper(apod: Apod, target: WallpaperTarget): Promise<void> {
  const file = await downloadApodImage(apod);
  try {
    await setWallpaper(file.uri, target);
  } catch (e) {
    // Keep any raw native message off the UI; setWallpaper already throws
    // user-safe Errors, but guard the unexpected case too.
    throw new Error(e instanceof Error ? e.message : 'Could not set the wallpaper.');
  }
}
