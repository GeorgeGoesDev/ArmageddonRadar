# Armageddon Radar — Phase 1: Foundation & Core UX

**Date:** 2026-07-15
**Status:** Approved design → ready for implementation plan
**Scope:** First of four planned phases. This phase only.

## Goal

Extend the existing single-screen asteroid tracker with a 7-day forecast,
list controls (search/sort/filter), a settings screen, and persistent
caching — all while keeping the current modal-based, no-navigation-library
architecture.

## Phasing context (for reference, not this spec)

1. **Phase 1 (this doc):** 7-day forecast, sort & filter, search, persistent
   cache, settings screen.
2. Phase 2: Sentry impact-risk, asteroid detail/approach history, APOD banner.
3. Phase 3: shareable image card, impact simulator, scale visualizer, haptics,
   onboarding.
4. Phase 4: daily digest notification, smart alert threshold, watchlist,
   home-screen widget.

## Product decisions (locked)

- **Forecast:** BOTH a day-selector strip on the dashboard AND a separate Week
  modal.
- **Navigation:** No navigation library. Single dashboard; header icons open
  Week and Settings as modals (consistent with the existing Detail modal).
- **List controls scope:** operate on the **selected day only** (client-side).
- **Controls included:** sort (closest / largest / fastest), filter hazardous-only,
  filter by size threshold, filter by distance threshold, plus name search.
- **Settings included:** unit toggles, in-app API key override, threat threshold
  tuning, about & attribution.

## Architecture

Two new pieces of persisted global state:

### SettingsProvider (React Context + AsyncStorage)

Holds and persists:

```ts
interface Settings {
  distanceUnit: 'lunar' | 'km' | 'miles';   // default 'lunar'
  velocityUnit: 'kph' | 'mph';              // default 'kph'
  dangerLD: number;                          // default 1
  safeLD: number;                            // default 5
  apiKeyOverride: string | null;             // default null (use built-in)
}
```

- `useSettings()` → `{ settings, update(partial), reset() }`.
- `useFormatters()` → distance/velocity/diameter formatters bound to the
  current units, so components never format raw numbers directly.
- Persisted to AsyncStorage under a single key; loaded on startup with a
  hydration flag (render a lightweight splash until hydrated).

### React Query persistence

- Wrap the existing `QueryClientProvider` with `PersistQueryClientProvider`
  using an AsyncStorage persister.
- Effect: app opens instantly showing the last cached week (works offline),
  then refetches in the background. `maxAge` = 24h; buster keyed to app version.

## Data layer

- **`fetchNeoWeek({ apiKey, startDate }): Promise<Record<string, Asteroid[]>>`** —
  a single NeoWs feed request for a 7-day range (`start_date` = today,
  `end_date` = today + 6). NeoWs allows up to 7 days per request. Reuses the
  existing `normalizeNeo` + date-key parsing; returns each day's array sorted by
  closest approach.
- **`useNeoWeek()`** replaces `useNeoFeed()`:
  - Query key: `['neo-week', startDateKey, resolvedApiKey]`.
  - `resolvedApiKey` = `settings.apiKeyOverride ?? DEFAULT_API_KEY`.
  - `staleTime` 24h, persisted (see above).
- The dashboard keeps `selectedDateKey` state and reads
  `week[selectedDateKey] ?? []`.
- Mock fallback: `buildMockFeedResponse` extended to a `buildMockWeek(startDate)`
  so demo mode and error-fallback still work across the week.

## Dashboard changes (`DashboardScreen`)

- **Header:** add 📅 (calendar) and ⚙️ (gear) icon buttons that open the Week
  and Settings modals.
- **Day-selector strip:** horizontal row of 7 chips (short weekday + closest-LD
  for that day, tinted by that day's threat zone). Selecting a chip sets
  `selectedDateKey`; gauge, radar, verdict, and card list re-point to it.
- **List controls bar** above the cards, acting on the selected day's list:
  - **Search:** text input filtering by `displayName` (case-insensitive substring).
  - **Sort:** cycling control — `closest` (missLunar asc, default) → `largest`
    (diameterAvgM desc) → `fastest` (velocityKph desc).
  - **Filter sheet:** hazardous-only switch; size-threshold slider (min diameter,
    m); distance-threshold slider (max miss distance, LD). Active-filter count
    badge on the filter button.
- A pure `applyListControls(asteroids, controls)` function computes the derived
  list (search → filter → sort). Empty result shows a "no matches" state.

## Week modal (`WeekSheet`)

- Modal sheet: horizontal bar chart, one bar per day, length ∝ (inverse of)
  closest approach, colored by that day's threat zone, ⚠️ marker on days with a
  hazardous object. Shows the closest-LD value per day.
- Tapping a day sets `selectedDateKey` on the dashboard and closes the modal.

## Settings modal (`SettingsSheet`)

- **Units:** segmented controls for distance (LD / km / miles) and velocity
  (km/h / mph).
- **API key:** text field bound to `apiKeyOverride`; save writes to settings and
  invalidates the `neo-week` query so it refetches with the new key. A "test"
  affordance is out of scope; invalid keys surface via the existing error state.
- **Threat thresholds:** two sliders (`dangerLD` 0.2–3, `safeLD` 3–15) with a
  guard that `dangerLD < safeLD`.
- **About:** app version (from `expo-constants`), "Data: NASA NeoWs", repo link
  (`Linking.openURL`).

## Existing-code refactors (targeted)

- **`utils/units.ts`:** convert the fixed `formatKph`/`formatMiles`/… into
  unit-aware formatters produced by `useFormatters()`. Provide pure conversion
  helpers (`lunarToKm`, `kmToMiles`, `kphToMph`, …) plus a `makeFormatters(units)`
  factory the hook wraps. Components call the hook instead of importing fixed
  formatters.
- **`utils/threat.ts`:** `getThreatLevel(lunar, { dangerLD, safeLD })` takes
  thresholds as a parameter (defaults preserved) instead of module constants.
  Callers pass thresholds from settings.

## New dependencies

- `@react-native-async-storage/async-storage`
- `@tanstack/react-query-persist-client`
- `@tanstack/query-async-storage-persister`
- `@react-native-community/slider`

(Installed via `npx expo install` for SDK-compatible versions.)

## Testing

Pure functions get unit tests (add Jest via `jest-expo`):

- `fetchNeoWeek` range parsing / per-day normalization (mock fetch).
- `applyListControls` — search, each sort key, each filter, and combinations.
- unit conversions and `makeFormatters` output per unit setting.
- `getThreatLevel` across thresholds (boundary cases at dangerLD/safeLD).

Manual on-device pass: day-selector re-points everything; Week modal selection
syncs; Settings persist across a cold restart; offline launch shows cached data.

## Acceptance criteria

- Dashboard shows a working 7-day selector; changing day updates gauge/radar/
  verdict/cards.
- One network request loads the whole week; subsequent launches render instantly
  from persisted cache and refresh in the background.
- Search, three sort modes, and all three filters work on the selected day.
- Week modal reflects real per-day closest approaches and drives selection.
- Settings persist across restarts and take effect app-wide: units reformat all
  values; API key override changes the fetch; threshold sliders move the gauge/
  verdict boundaries.
- Existing features (threat gauge, radar sweep, detail sheet, reminders, share)
  continue to work.

## Out of scope

All Phase 2–4 features: Sentry/APOD/detail-history data, notifications, watchlist,
home-screen widget, image share, impact simulator, scale visualizer, haptics,
onboarding.
