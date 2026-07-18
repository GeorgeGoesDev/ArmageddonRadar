import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { Apod } from '../types/apod';
import { setWallpaper, WallpaperTarget } from '../../modules/apod-wallpaper';
import { TFunc } from '../i18n/LocaleContext';

// The (English, module-layer) message `setWallpaper` throws when the native
// module isn't present (e.g. Expo Go). Matched here so the boundary can
// re-throw a localized message without modifying the module itself.
const WALLPAPER_NEEDS_BUILD_MESSAGE = 'Setting wallpaper needs a full app build.';

function imageUrlFor(apod: Apod, t: TFunc): string {
  const url = apod.hdImageUrl || apod.imageUrl;
  if (!url) throw new Error(t('apod.noDownloadableImage'));
  return url;
}

/** Downloads the HD image (falling back to the standard one) into the cache directory. */
export async function downloadApodImage(apod: Apod, t: TFunc): Promise<File> {
  const url = imageUrlFor(apod, t);
  const dir = new Directory(Paths.cache, 'apod');
  try {
    // `Directory.create()` is synchronous and can throw (e.g. if the cache
    // directory is missing or unwritable), so it must stay inside this guard.
    if (!dir.exists) dir.create();
    // `idempotent: true` lets a second tap re-download over the same cached
    // file instead of rejecting with `DestinationAlreadyExists`.
    return await File.downloadFileAsync(url, dir, { idempotent: true });
  } catch {
    throw new Error(t('apod.downloadError'));
  }
}

/** Saves the APOD image into the device gallery. */
export async function saveApodToGallery(apod: Apod, t: TFunc): Promise<void> {
  const file = await downloadApodImage(apod, t);
  // requestPermissionsAsync(writeOnly?, granularPermissions?) takes positional
  // arguments in this SDK, not an options object.
  let perm;
  try {
    perm = await requestPermissionsAsync(false, ['photo']);
  } catch {
    throw new Error(t('apod.saveError'));
  }
  if (!perm.granted) throw new Error(t('apod.permissionDenied'));
  try {
    await Asset.create(file.uri);
  } catch {
    throw new Error(t('apod.saveError'));
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
export async function setApodAsWallpaper(apod: Apod, target: WallpaperTarget, t: TFunc): Promise<void> {
  const file = await downloadApodImage(apod, t);
  try {
    await setWallpaper(file.uri, target);
  } catch (e) {
    // Keep any raw native/module message off the UI — including the module's
    // own (English) "needs a full app build" text — and surface a localized
    // one instead.
    if (e instanceof Error && e.message === WALLPAPER_NEEDS_BUILD_MESSAGE) {
      throw new Error(t('apod.wallpaperNeedsBuild'));
    }
    throw new Error(t('apod.wallpaperError'));
  }
}
