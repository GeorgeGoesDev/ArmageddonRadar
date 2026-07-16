# Armageddon Radar — Phase 4a: Watchlist + Smart Notifications

**Date:** 2026-07-16
**Status:** Approved design → ready for implementation plan
**Scope:** First half of Phase 4 (the final phase). This sub-project only. Builds on
Phases 1–3.5 (merged to main). The home-screen widget is **Phase 4b** (separate
spec/plan) and is out of scope here.

## Goal

Three interlocking, pure-JS features on top of the existing `expo-notifications`
wiring — **no new dependencies**:

1. **Watchlist** — star/save asteroids (persisted) and a dedicated screen that
   resolves every starred object, even ones outside the current 7-day feed.
2. **Daily digest** — a once-a-day local notification with the day's
   closest-approach headline, at a user-set hour.
3. **Smart alerts** — automatic one-shot notifications when an approaching object
   comes within the user's danger threshold, firing at the approach moment.

## Architecture

All client-side. Three units with clear boundaries:

- **Watchlist** — a persisted `Set<string>` of asteroid ids + a resolver screen.
- **Notification planners** — *pure* functions turning the cached feed + settings
  into a list of notifications to schedule. Fully unit-testable, no side effects.
- **Scheduler** — a thin side-effecting layer that runs at app-open (after the
  week feed loads, and when digest settings change): it cancels the previously
  scheduled **auto** notifications and schedules the fresh plan.

### Notification freshness model (decided)

Local notifications cannot fetch data when they fire. Rather than a background
task (unreliable, throttled, and aggressively killed on the user's MIUI device),
we **schedule from the cached feed at app-open**: on open we already hold the
7-day NEO feed, so we compute and schedule the next several days of digests and
all in-window threshold alerts with real content. Trade-off (accepted):
notifications only refresh when the app is opened and run dry after ~7 days of
non-use.

### Expo Go caveat (unchanged)

`expo-notifications` no-ops in Expo Go (SDK 53+) and works in dev/prod builds.
The scheduler reuses the existing `isExpoGo` guard and the "needs a real build"
hint; in Expo Go the whole scheduling path is a graceful no-op.

## Feature 1 — Watchlist

### Persistence (`src/watchlist/WatchlistContext.tsx`)
- `WatchlistProvider` mirrors the existing `SettingsProvider` pattern: holds a
  `Set<string>` of starred asteroid ids, hydrated from and persisted to
  AsyncStorage under key `watchlist:v1` (stored as a JSON string array).
- API exposed via `useWatchlist()`: `isWatched(id: string): boolean`,
  `toggle(id: string): void`, `ids: string[]`.
- Provider mounted in `App.tsx` alongside the settings/query providers.

### Star toggle (UI)
- A ★ / ☆ `Pressable` on `AsteroidCard` (leading-corner or trailing) and in the
  `DetailSheet` header. Bound to `isWatched`/`toggle`. Firing `hapticSuccess`
  (gated on `settings.hapticsEnabled`) when a star is **added**.

### Watchlist screen (`src/screens/WatchlistSheet.tsx`)
- Opened from a header icon on the dashboard (a ★ next to the existing header
  actions).
- Lists every starred object:
  - Ids present in the current week feed render directly (reusing `AsteroidCard`
    or a compact row).
  - Ids **not** in the feed are resolved by id through the existing
    `useNeoDetail`/`/neo/{id}` path and shown as compact rows; when such an object
    has no upcoming Earth approach, the row reads "not currently approaching".
  - Empty state when nothing is starred.
- The screen uses a scrollable sheet with the Phase 3.5 `flexShrink: 1` fix.

## Feature 2 — Daily digest

### Settings (`src/settings/settingsModel.ts`)
- Add `dailyDigestEnabled: boolean` (default `true`) and `digestHour: number`
  (0–23, default `9`). `mergeSettings` validates: `dailyDigestEnabled` coerces
  non-booleans to default; `digestHour` coerces to an integer in 0–23 or falls
  back to `9`.

### Planner (`src/utils/notificationPlan.ts`, pure)
- `planDailyDigests(feed: Asteroid[], digestHour: number, now: number): DigestPlan[]`
  where `DigestPlan = { fireDate: Date; title: string; body: string; dayKey: string }`.
- For each of the next up-to-7 distinct approach-days present in the feed, pick
  that day's **closest** object (min `missLunar`) and build a digest firing at
  `digestHour:00` local that day. The headline body is
  `🌑 {name} passes {distance} away — {THREAT}` (threat label from
  `getThreatLevel` against the user thresholds; distance via the user's unit
  formatter where wired, else lunar distances).
- Skip a day whose `digestHour` is already in the past relative to `now`
  (so "today" is only scheduled if its hour hasn't passed).

## Feature 3 — Smart alerts

### Settings
- Add `smartAlertsEnabled: boolean` (default `true`); `mergeSettings` coerces
  non-booleans to default.

### Planner (`src/utils/notificationPlan.ts`, pure)
- `planSmartAlerts(feed: Asteroid[], dangerLD: number, now: number): AlertPlan[]`
  where `AlertPlan = { fireDate: Date; title: string; body: string; asteroidId: string }`.
- Select objects whose `approachEpochMs` is in the **future** and whose
  `missLunar <= dangerLD`; each fires at its approach time. **De-dupe by
  asteroid id** (one alert per object). Sorted ascending by `fireDate`.

## Scheduler (`src/utils/notificationScheduler.ts`, side-effecting)

- `syncAutoNotifications(feed, settings, now)`:
  1. No-op in Expo Go; otherwise ensure permissions and the two Android channels
     `daily-digest` and `smart-alerts` (mirroring the existing
     `ensureAndroidChannel`).
  2. Cancel the previously-scheduled **auto** notifications: their ids are tracked
     in AsyncStorage (`scheduledAuto:v1`). This never touches the user's manual
     telescope reminders (which are not in that set).
  3. Build the plan: digests via `planDailyDigests` when `dailyDigestEnabled`;
     alerts via `planSmartAlerts` when `smartAlertsEnabled`. Schedule each with
     the appropriate channel; each carries `data.kind` (`'digest' | 'alert'`).
  4. Persist the new set of scheduled ids to `scheduledAuto:v1`.
- **Trigger:** an effect in `DashboardScreen` (or `App`) that runs when the week
  feed successfully loads/changes and when the digest/alert settings change.

## Settings UI (`src/screens/SettingsSheet.tsx`)
- A "Daily digest" `Switch` bound to `dailyDigestEnabled`, plus an hour
  **stepper** (−/+ around `digestHour`, wrapping 0–23) — dependency-free, no
  time-picker.
- A "Smart alerts" `Switch` bound to `smartAlertsEnabled`, with a one-line
  caption ("Auto-notify when an asteroid comes within your danger distance").
- Reuse the existing "needs a real build" hint copy where notifications are
  configured.

## New / changed files

```
New:
  src/watchlist/WatchlistContext.tsx
  src/screens/WatchlistSheet.tsx
  src/utils/notificationPlan.ts        (+ __tests__)
  src/utils/notificationScheduler.ts
Changed:
  src/settings/settingsModel.ts        (+ 3 fields, mergeSettings, + test)
  src/components/AsteroidCard.tsx       (star toggle)
  src/screens/DetailSheet.tsx          (star toggle)
  src/screens/SettingsSheet.tsx        (digest + alerts controls)
  src/screens/DashboardScreen.tsx      (watchlist header icon + scheduler effect)
  App.tsx                              (WatchlistProvider)
```

## Testing

Unit tests (`jest-expo`) for the pure logic:
- `planDailyDigests` — closest-per-day selection; skips today when `digestHour`
  already passed; caps at the available days (≤7); empty feed → `[]`.
- `planSmartAlerts` — threshold filter (`<= dangerLD`); future-only; de-dupe by
  id; ascending `fireDate` order.
- `mergeSettings` — the three new fields default and validate (incl. `digestHour`
  clamped to 0–23 integer); existing fields unaffected.
- Watchlist add/remove/toggle logic (if the reducer is extracted as a pure
  helper).

UI/integration (star button, watchlist screen resolution, settings controls,
actual scheduling/cancellation) verified via `tsc --noEmit` + `expo export
--platform android` + on-device.

## Acceptance criteria

- Starring an asteroid (card or detail) persists across app restarts; a dedicated
  Watchlist screen lists all starred objects, resolving ones outside the current
  7-day window and labelling those "not currently approaching"; empty state shows
  when none are starred.
- With a real build, a daily digest notification fires at the configured hour with
  the day's closest-approach headline; toggling it off (or changing the hour)
  reschedules on next app-open.
- With a real build, an approaching object within the danger threshold produces a
  single auto-alert at its approach time; below-threshold objects do not; the
  user's manual telescope reminders are unaffected by auto-scheduling.
- In Expo Go, all scheduling gracefully no-ops (no crash).
- All Phase 1–3.5 features continue to work.

## Out of scope

Phase 4b: the Android home-screen widget (native, new dependency, separate
spec/plan). Background-fetch refresh of notifications (rejected in favour of
schedule-at-app-open). iOS widgets.
