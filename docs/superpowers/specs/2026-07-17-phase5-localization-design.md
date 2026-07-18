# Armageddon Radar — Phase 5: Localization (English + Greek)

**Date:** 2026-07-17
**Status:** Approved design → ready for implementation plan
**Scope:** Add app localization with a real i18n framework, ship English + Greek,
and remove the developer-only "needs a real build (not Expo Go)" hint copy. Builds
on Phases 1–4b + 3.6 (all merged to main). The planned 1–4 roadmap is complete;
this is a new phase.

## Goal

1. **Localize the app** — every app-authored user-facing string becomes a keyed
   translation, with English and Greek catalogs.
2. **Language selection** — auto-detect the device language on first launch
   (Greek device → Greek, else English), with a manual override in Settings that
   persists.
3. **Localized number formatting** — Greek renders `3,4 LD` / `384.400 km` (comma
   decimal, dot thousands); English keeps `3.4 LD` / `384,400 km`.
4. **Remove the Expo-Go hint copy** — the three developer warnings that only ever
   appear in Expo Go.

**Out of scope:** translating NASA data (asteroid names, APOD title/explanation,
approach text) — it arrives from the API in English and is dynamic. Languages
beyond English/Greek (the framework makes adding a third trivial, but none are
built now). RTL layout.

## Approach (decided)

**`expo-localization` + `i18n-js`** — the standard Expo i18n stack.
`expo-localization` reads the device locale; `i18n-js` (v4, `new I18n(...)`) does
lookup, `%{param}` interpolation, and `{count}` pluralization. `expo-localization`
is a native module with a config plugin, so this phase **requires a prebuild**.

The known trade-off of this stack vs a hand-typed catalog is that keys are
stringly-typed (no compile-time completeness check). We mitigate that with a
**key-parity unit test** (below) that fails if the English and Greek catalogs
don't have identical key sets.

## Architecture

Client-side, mirroring the existing `SettingsContext`/`WatchlistContext` patterns.

- **`src/i18n/en.ts`, `src/i18n/el.ts`** — nested translation catalogs (i18n-js
  format), organized by area (`common`, `dashboard`, `detail`, `threat`,
  `settings`, `onboarding`, `widget`, `notify`, …). `el.ts` mirrors `en.ts` key
  for key.
- **`src/i18n/i18n.ts`** — builds the shared instance:
  `new I18n({ en, el }, { defaultLocale: 'en', enableFallback: true })`. Fallback
  means a missing Greek key renders the English string, never a raw key.
- **`src/i18n/LocaleContext.tsx`** — `LocaleProvider` holds the active locale,
  hydrates from / persists to AsyncStorage (`locale:v1`), sets `i18n.locale`, and
  exposes `useTranslation(): { t, locale, setLocale }`. `t` is bound to the
  current locale; `setLocale('en' | 'el')` updates the instance and re-renders.
- **`src/i18n/format.ts`** — pure `formatNumber(value, locale, fractionDigits)`
  and locale helpers (see Number formatting).
- **Device detection** — on first launch (no persisted locale),
  `getLocales()[0].languageCode === 'el' ? 'el' : 'en'`. The Settings picker
  overrides thereafter.
- **Mounting** — `LocaleProvider` wraps the existing providers in `App.tsx` so all
  consumers (including `SettingsSheet`, onboarding) can translate.

### Localizing non-React surfaces (widget + notifications)

The Phase 4b **widget** renders in a bare headless task and the **notifications**
render when they fire — neither can call `useTranslation()`. But both are *built*
app-side where the locale is available:

- **Widget:** `buildWidgetSnapshot` gains `t` (+ `locale` for number formatting).
  The snapshot stores **already-localized** strings (`threatLabel`, `absoluteTime`
  like "Σήμερα 14:20", `distance`); the headless handler just renders them. No i18n
  in the handler.
- **Notifications:** `planDailyDigests` / `planSmartAlerts` take `t` (+ locale) and
  produce localized `title`/`body` at schedule time.

Trade-off (accepted, same schedule-from-cache model as 4a): content scheduled/
snapshotted in one language stays that language until the next app-open rebuilds
it. Switching language in Settings triggers a reschedule + widget resync on the
next feed effect, so it self-corrects on app use.

## String extraction

Pull every app-authored string from the ~20 UI files into the catalogs. Catalog
shape (English shown; Greek mirrors the keys, drafted by the assistant and
reviewed by the user, a native Greek speaker, before merge):

```ts
export const en = {
  common:    { close: 'Close', cancel: 'Cancel', retry: 'Retry', /* … */ },
  dashboard: { title: 'Armageddon Radar', emptyDay: 'No approaches today', /* … */ },
  detail:    { hazardous: 'HAZARDOUS', setReminder: 'Set Telescope Reminder', /* … */ },
  threat:    { hazardVerdict: '🚨 Lock your doors. (Just kidding, but it’s close!)',
               watchVerdict: '👀 Keep your eyes on the skies.',
               safeVerdict: '🛡️ Verdict: Not today, space rocks.',
               hazardShort: 'Lock your doors (just kidding… mostly)', /* … */ },
  settings:  { title: 'Settings', language: 'Language', dailyDigest: 'Daily digest', /* … */ },
  onboarding:{ /* … */ },
  widget:    { nextApproach: 'NEXT APPROACH', radar: 'RADAR',
               expired: 'Radar data expired', tapRefresh: 'Tap to refresh',
               tapStart: 'Tap to start tracking',
               labelHazardous: 'HAZARDOUS', labelCaution: 'CAUTION', labelSafe: 'SAFE' },
  notify:    { digestBody: '🌑 %{name} passes %{distance} away — %{threat}', /* … */ },
};
```

- Interpolation via i18n-js `%{name}` (e.g. the digest headline).
- **Signature changes** so build-time surfaces get `t`: `getThreatLevel` stops
  returning English `verdict`/`shortVerdict` strings — it keeps `zone`, `color`,
  `t`-value — and two new pure helpers `threatVerdict(t, zone)` /
  `threatShortVerdict(t, zone)` produce the localized text from the catalog. Every
  current reader of `.verdict`/`.shortVerdict` switches to those helpers.
  `planDailyDigests`/`planSmartAlerts` and `buildWidgetSnapshot` take `t` + `locale`.
- The three Expo-Go hints (`SettingsSheet.tsx` "Needs a real build (not Expo Go)",
  `DetailSheet.tsx` "in Expo Go this is a preview…", and the `EXPO_GO_HINT`
  constant in `notifications.ts`) are **not carried into the catalogs** — removed
  by omission. Any UI branch that only rendered them is deleted.
- NASA data is never keyed — it passes through as-is.

## Number & date formatting

- **`formatNumber(value, locale, fractionDigits = 0)`** (pure) swaps separators by
  locale: `en` → `1,234.5`, `el` → `1.234,5`. Deterministic and unit-testable — it
  does **not** rely on `Intl('el-GR')` ICU data being present on the device (the
  app currently uses `Intl.NumberFormat('en-US')`, but Greek ICU data is not
  guaranteed, so we format by explicit separators).
- **`units.ts`** `makeFormatters` gains a `locale` param and routes all number
  output through `formatNumber`; `useFormatters` passes the active locale. Unit
  labels (`km`, `LD`, `mph`) stay as-is (they are conventional symbols).
- **Relative dates / weekdays** — "Today"/"Σήμερα" and weekday abbreviations become
  keyed strings; `formatApproachTime` (widget) and any date display take `t`,
  extending the existing Hermes-safe weekday array (no `Intl` for dates).

## Settings UI + hint removal

- A **"Language"** row in `SettingsSheet` with an **English / Ελληνικά** segmented
  control (same control style as the existing unit toggles), bound to `setLocale`.
- The three Expo-Go warning strings are deleted (see String extraction).

## New / changed files

```
New:
  src/i18n/en.ts
  src/i18n/el.ts
  src/i18n/i18n.ts
  src/i18n/LocaleContext.tsx
  src/i18n/format.ts              (+ __tests__)
  src/i18n/__tests__/catalogs.test.ts   (key-parity)
Changed (representative — extraction touches all UI files):
  App.tsx                         (LocaleProvider)
  app.json                        (expo-localization plugin)
  package.json                    (expo-localization, i18n-js)
  src/settings/settingsModel.ts   (locale is NOT stored here — see note)
  src/screens/*.tsx               (t() everywhere; remove hint copy)
  src/components/*.tsx            (t())
  src/utils/threat.ts             (verdicts → catalog / t)
  src/utils/units.ts              (locale-aware formatting)
  src/settings/useFormatters.ts   (pass locale)
  src/utils/notificationPlan.ts   (t + locale)
  src/widget/snapshot.ts          (buildWidgetSnapshot takes t + locale)
  src/widget/sync.tsx             (pass t + locale)
  src/screens/DashboardScreen.tsx (pass t/locale to sync + scheduler)
```

**Note:** locale lives in its own `locale:v1` AsyncStorage key and
`LocaleContext`, not in `Settings`, to keep the i18n concern self-contained and
avoid threading it through `mergeSettings`. `SettingsSheet` reads it via
`useTranslation()`.

## Testing

Unit tests (`jest-expo`):
- **Key parity** (`catalogs.test.ts`) — recursively collect the key paths of `en`
  and `el`; assert the sets are identical. This is the safety net for the
  stringly-typed stack; a missing or misspelled Greek key fails CI.
- **`formatNumber`** — `en`/`el` decimal + thousands (`1234.5` → `1,234.5` /
  `1.234,5`; integers; negative; zero-fraction).
- **Device-locale mapping** — `el`/`el-GR` → `el`, `en`/`nl`/`de` → `en`.
- **Localized builders** — `buildWidgetSnapshot` and the notification planners
  produce Greek strings when passed a Greek `t` (spot-check one key + one
  interpolation).

UI/integration verified with `tsc --noEmit`, `expo export --platform android`, and
**on-device in both languages** — toggling Language in Settings flips all app copy,
numbers reformat, the widget and a fresh notification pick up the language on next
app-open, and NASA data stays English.

## Build note

`expo-localization` is native with a config plugin → this phase needs
`npx expo prebuild -p android --clean` → recreate `android/local.properties`
(forward slashes) → `gradlew :app:assembleRelease` → install. See `BUILD.md` and
the `local.properties`/`JAVA_HOME`/daemon-lock notes. (The local `apod-wallpaper`
module and the widget survive prebuild via autolinking, as before.)

## Acceptance criteria

- On a Greek-language device, a fresh install starts in Greek; on any other, in
  English. The Settings **Language** control switches between English and Ελληνικά
  and persists across restarts.
- All app-authored copy — labels, buttons, settings, onboarding, empty/stale
  states, error messages, and the jokey threat verdicts — renders in the selected
  language. NASA-supplied text stays English.
- Numbers follow the selected language: Greek shows `3,4 LD` / `384.400 km`,
  English shows `3.4 LD` / `384,400 km`.
- The widget and a freshly scheduled notification appear in the selected language
  after the app has been opened in that language.
- The "needs a real build (not Expo Go)" copy no longer appears anywhere.
- A missing Greek translation falls back to English (never a raw key).
- All Phase 1–4b + 3.6 features continue to work; `npx jest` and `tsc` stay green.

## Out of scope

Translating NASA/APOD content; languages beyond en/el; RTL; localized
currency/measurement (the app has none). Per-string machine translation review
tooling — Greek is drafted by the assistant and reviewed by the user before merge.
