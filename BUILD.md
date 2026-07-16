# Building & Installing Armageddon Radar

How to run the app in development and how to build/install the standalone Android
APK yourself.

## Prerequisites (one-time)

- **Node** ≥ 20.19.4 (24 LTS recommended) and **npm**
- **JDK 17** (Microsoft OpenJDK works) — for the native Android build
- **Android SDK** with platform-tools, an installed platform (`android-36`) and
  build-tools (`36.1.0`)
- Environment variables:
  - `JAVA_HOME` → your JDK 17 folder (e.g. `C:\Program Files\Microsoft\jdk-17...`)
  - `ANDROID_HOME` → your SDK folder (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`)
- Install project dependencies once:
  ```bash
  npm install
  ```
- **NASA API key** (optional): copy `.env.example` to `.env` and set
  `EXPO_PUBLIC_NASA_API_KEY=<your key>` (get a free key at https://api.nasa.gov/).
  Without it the app falls back to the shared, rate-limited `DEMO_KEY`. The Sentry
  impact-risk board needs no key.

## Run in development (fastest — Expo Go)

1. Install **Expo Go** on your phone (Play Store).
2. Start the dev server:
   ```bash
   npm start
   ```
3. **Same Wi-Fi:** scan the QR code with Expo Go.
   **USB instead:** connect the phone (USB debugging on), then in another terminal:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
   and press `a` in the Expo terminal (or open `exp://127.0.0.1:8081` in Expo Go).

> Note: `expo-notifications` (the telescope reminder) does **not** fire in Expo Go
> on Android — it needs a real build (below). Everything else works in Expo Go.

## Build the standalone release APK

This produces an installable app that runs on its own (no computer, no Expo Go).

```bash
# 1. Generate the native Android project (autolinks native modules + config plugins).
#    --clean is important after adding a native dependency (e.g. expo-image).
npx expo prebuild -p android --clean

# 2. Point Gradle at your SDK (create android/local.properties):
#    Windows example — adjust the path to your SDK:
#    sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk

# 3. Build the release APK:
cd android
./gradlew :app:assembleRelease        # Windows: .\gradlew.bat :app:assembleRelease
cd ..
```

The APK lands at:
```
android/app/build/outputs/apk/release/app-release.apk
```

It is signed with the auto-generated **debug keystore** — fine for installing on
your own device, but not for the Play Store. First build downloads Gradle and
takes several minutes; later builds are faster.

## Install the APK on your phone

**Option A — over USB (`adb`):**
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```
On Xiaomi/HyperOS you must enable **Developer options → Install via USB** (and
accept the on-screen prompt), or this fails with `INSTALL_FAILED_USER_RESTRICTED`.

**Option B — sideload (no debugging needed):**
```bash
adb push android/app/build/outputs/apk/release/app-release.apk /sdcard/Download/ArmageddonRadar.apk
```
Then on the phone: **Files → Downloads → tap `ArmageddonRadar.apk`** and allow
"install unknown apps" for your file manager.

## App identity

- **Package / application id:** `com.georgegoesdev.armageddonradar`
- **Icon:** `assets/logo.png` (+ padded adaptive foreground `assets/adaptive-foreground.png`)

## Handy checks

```bash
npm test            # unit tests (jest-expo)
npx tsc --noEmit    # type-check
npx expo export --platform android --output-dir dist-check && rm -rf dist-check   # verify the JS bundle compiles
adb devices         # confirm the phone is connected
```
