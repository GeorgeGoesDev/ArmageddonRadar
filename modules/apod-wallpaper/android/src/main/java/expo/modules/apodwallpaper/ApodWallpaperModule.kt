package expo.modules.apodwallpaper

import android.app.WallpaperManager
import android.content.Context
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Sets the device wallpaper directly from a local image file.
 *
 * We read the bytes ourselves (holding SET_WALLPAPER) and hand them to
 * WallpaperManager, so no content URI ever crosses a process boundary — that is
 * what makes this work on MIUI, whose wallpaper cropper cannot read another app's
 * granted URI (the ACTION_ATTACH_DATA intent fails there with "could not load
 * data"). The trade-off is no crop UI: the image is applied as-is.
 */
class ApodWallpaperModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ApodWallpaper")

    // target: "home" | "lock" | "both". Runs off the JS thread (AsyncFunction),
    // which is what we want for the file read + wallpaper write.
    AsyncFunction("setWallpaper") { uri: String, target: String ->
      val flags = when (target) {
        "home" -> WallpaperManager.FLAG_SYSTEM
        "lock" -> WallpaperManager.FLAG_LOCK
        "both" -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        else -> throw InvalidTargetException(target)
      }

      val manager = WallpaperManager.getInstance(context)
      try {
        context.contentResolver.openInputStream(Uri.parse(uri)).use { stream ->
          if (stream == null) throw WallpaperReadException()
          manager.setStream(stream, null, true, flags)
        }
      } catch (e: CodedException) {
        throw e
      } catch (e: Exception) {
        throw WallpaperSetException(e)
      }
    }
  }
}

private class InvalidTargetException(target: String) :
  CodedException("Unknown wallpaper target: $target")

private class WallpaperReadException :
  CodedException("Could not read the image file.")

private class WallpaperSetException(cause: Exception) :
  CodedException("Could not set the wallpaper.", cause)
