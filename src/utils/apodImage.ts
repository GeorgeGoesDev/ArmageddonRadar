import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { startActivityAsync } from 'expo-intent-launcher';
import { Apod } from '../types/apod';

/** Android's FLAG_GRANT_READ_URI_PERMISSION: without it the target app cannot read our URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

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
 * Hands the image to Android's own "set wallpaper" flow. There is no Expo
 * wallpaper API; ACTION_ATTACH_DATA lets the system (MIUI's wallpaper editor,
 * on this device) supply the crop controls and the home/lock choice.
 */
export async function setApodAsWallpaper(apod: Apod): Promise<void> {
  const file = await downloadApodImage(apod);
  try {
    await startActivityAsync('android.intent.action.ATTACH_DATA', {
      data: file.contentUri,
      type: 'image/*',
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch {
    // No handler for ACTION_ATTACH_DATA on this device/launcher throws
    // ActivityNotFoundException with a raw system message; keep that off the UI.
    throw new Error('Could not open the wallpaper picker on this device.');
  }
}
