# Armageddon Radar — Support-the-Dev Link

**Date:** 2026-07-18
**Status:** Approved design → ready for implementation plan
**Scope:** A single, tasteful "support the dev" row in Settings that opens an
external Ko-fi page. Small, self-contained. Builds on the merged localization
(Phase 5) — the label is a catalog key.

## Goal

Give users a gentle, optional way to support the developer, without ads,
in-app purchases, Play Store billing, or any new dependency.

## Decisions (from brainstorm)

- **Platform:** Ko-fi (one-off or monthly tips; supporter needs no account).
- **Placement:** a warm "☕ Support the dev" row in the existing Settings → About
  section, directly below "Source on GitHub".
- **Mechanism:** `Linking.openURL(KOFI_URL)` — the exact pattern the existing
  GitHub link uses. No native module, no store, no IAP.

## Design

A single `Pressable` row added to `src/screens/SettingsSheet.tsx`, in the About
section right after the "Source on GitHub" link:

- A `MaterialCommunityIcons` `coffee` icon + the label, in `colors.accentBlue`,
  laid out as an icon-plus-text row.
- `onPress` → `Linking.openURL(KOFI_URL).catch(() => {})` (guard the rare
  no-handler rejection so a failed open never crashes the sheet).
- **`KOFI_URL` constant** near the existing `REPO_URL` at the top of the file:
  `const KOFI_URL = 'https://ko-fi.com/georgegoesdev';` — the maintainer confirms
  or replaces the handle before the build.
- **Label:** a new catalog key `settings.supportDev`, mirrored in both languages:
  - EN: `Support the dev`
  - EL (draft, maintainer reviews): `Κέρασέ με έναν καφέ`
  The key-parity test (`catalogs.test.ts`) must stay green.

## Files

```
Changed:
  src/screens/SettingsSheet.tsx   (KOFI_URL constant + the About-section row)
  src/i18n/en.ts                  (settings.supportDev)
  src/i18n/el.ts                  (settings.supportDev)
```

No new dependency; JS-only → no prebuild, just a rebuild.

## Testing

Consistent with the existing "Source on GitHub" link (which has no unit test):
- `npx tsc --noEmit` clean.
- `npx jest src/i18n/__tests__/catalogs.test.ts` — en/el parity holds with the
  new key.
- On-device: the row appears in Settings → About in both languages and tapping it
  opens the Ko-fi page in the browser.

## Acceptance criteria

- Settings → About shows a "☕ Support the dev" row below "Source on GitHub",
  localized (EN/EL), styled in the app's accent colour.
- Tapping it opens the configured Ko-fi URL in the device browser; a failed open
  is a no-op, not a crash.
- Key parity holds; all existing features and tests unaffected.

## Out of scope

In-app purchases / Play Store billing; recurring-nag prompts; any second
placement (a one-time nudge card was considered and rejected as less tasteful);
analytics on taps.
