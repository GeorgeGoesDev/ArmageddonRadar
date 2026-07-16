# Armageddon Radar — Phase 2: Deeper Data

**Date:** 2026-07-16
**Status:** Approved design → ready for implementation plan
**Scope:** Second of four phases. This phase only. Builds on Phase 1 (merged to main).

## Goal

Add three "fetch a new data source → show a view" features: a Sentry impact-risk
board, an enhanced asteroid detail (orbital elements + close-approach history +
timeline + metadata via NeoWs `/neo/{id}`), and an APOD (Astronomy Picture of
the Day) hero banner. Stays modal-based (no navigation library), reuses the
Phase 1 React Query + AsyncStorage persistence and the existing modal/skeleton
patterns.

## Product decisions (locked)

- **Sentry:** a dedicated **Impact Risk board** (modal from a header icon)
  listing top global risk objects, ranked by cumulative impact probability. Not
  cross-referenced against today's feed.
- **Detail enhancement:** feed asteroids get **all four** additions — orbital
  elements, close-approach history list, an approach timeline chart, and extra
  metadata — lazy-fetched from `/neo/{id}` when the sheet opens.
- **Sentry object detail** is **risk-focused** (impact probability, Torino,
  Palermo, energy, impact-year window, diameter) from the Sentry per-object API,
  NOT the NeoWs orbital detail — Sentry returns a designation that doesn't map
  cleanly to a NeoWs SPK id, and the risk numbers are the point there.
- **APOD:** a **hero banner** at the top of the dashboard; tap expands a modal
  with the full image + title + explanation. Video days show a placeholder that
  links out.

## APIs & auth

| Feature | Endpoint | Auth |
| --- | --- | --- |
| Sentry board | `GET https://ssd-api.jpl.nasa.gov/sentry.api` | **None** (JPL SSD/CNEOS; no api_key, no DEMO_KEY rate limit) |
| Sentry detail | `GET https://ssd-api.jpl.nasa.gov/sentry.api?des=<des>` | None |
| Asteroid detail | `GET https://api.nasa.gov/neo/rest/v1/neo/{id}?api_key=<key>` | `resolveApiKey(settings)` (Phase 1) |
| APOD | `GET https://api.nasa.gov/planetary/apod?api_key=<key>` | `resolveApiKey(settings)` |

All three go through the existing persisted `QueryClient`. Sentry board + APOD
have a 24h `staleTime` (change daily); `/neo/{id}` detail is effectively static,
so a long `staleTime` (e.g. 7d) is fine.

## Feature 1 — Impact Risk board (Sentry)

### Data (`src/api/sentry.ts`, `src/types/sentry.ts`)
- Summary response: `{ signature, count, data: SentryRow[] }`. Each row (strings
  from the API): `des`, `fullname`, `ip` (cumulative impact probability),
  `ps_cum` (Palermo cumulative), `ts_max` (max Torino), `diameter` (km),
  `n_imp` (# potential impacts), `range` (e.g. `"2023-2118"`), `last_obs`, `h`.
- **`normalizeSentry(row): SentryRisk`** → `{ designation, name, impactProb: number,
  palermoCum: number, torinoMax: number, estDiameterM: number, nImpacts: number,
  yearRange: string }` (parse numeric strings; km→m for diameter).
- **`fetchSentryRisks(): Promise<SentryRisk[]>`** → sorted by `impactProb`
  descending, capped to a sensible top-N (e.g. 100) for the list.
- **`fetchSentryDetail(des): Promise<SentryDetail>`** → `{ designation, name,
  impactProb, palermoCum, palermoMax, torinoMax, energyMt: number,
  estDiameterM: number, massKg: number, vInfKps: number, yearRange, nImpacts,
  firstObs, lastObs }` from the per-object summary.

### UI
- **`TorinoChip`** (`src/components/TorinoChip.tsx`) — small color-coded chip for
  Torino 0–10 (0 grey/blue → 8–10 red), used in the board rows and detail.
- **`ImpactRiskSheet`** (`src/screens/ImpactRiskSheet.tsx`) — modal from a new
  ☠️ header icon. Header "Impact Risk"; scrollable ranked list, each row:
  designation/name, `1-in-N` odds (`1 / impactProb` rounded), `TorinoChip`,
  diameter. Loading skeleton + error state reuse Phase 1. Tap → opens
  `SentryDetailSheet` for that `des`.
- **`SentryDetailSheet`** (`src/screens/SentryDetailSheet.tsx`) — modal;
  lazy-fetches `fetchSentryDetail(des)`. Shows impact probability (as `1-in-N`
  and %), Torino + Palermo, impact energy (MT), estimated diameter, potential
  impact-year window, mass, `v∞`, first/last observation. A one-line plain-language
  caption (e.g. "Torino 0 — no unusual danger").

## Feature 2 — Enhanced asteroid detail (`/neo/{id}`)

### Data (`src/api/nasa.ts` add, `src/types/neoDetail.ts`)
- **`fetchNeoDetail(id, apiKey): Promise<NeoDetail>`** parsing:
  - `orbital_data` → `{ semiMajorAxisAu, eccentricity, inclinationDeg,
    orbitalPeriodDays, perihelionAu, aphelionAu, orbitClassType,
    orbitClassDescription, firstObservation, lastObservation }`.
  - `close_approach_data[]` → `ApproachEntry[]` `{ epochMs, dateFull, missLunar,
    missKm, velocityKph, orbitingBody }`, sorted ascending by epoch.
  - top-level `{ absoluteMagnitude, isHazardous }`.
- **`useNeoDetail(id)`** (`src/hooks/useNeoDetail.ts`) — React Query, key
  `['neo-detail', id]`, `staleTime` 7d, `enabled` only when an id is provided,
  uses `resolveApiKey(settings)`.

### UI (`src/screens/DetailSheet.tsx` additions; `src/components/ApproachTimeline.tsx`)
- Below the existing orbital-mechanics block, four sections gated on the
  `useNeoDetail` state (inline spinner while loading, graceful "unavailable" if
  it errors — the existing feed-derived detail always renders regardless):
  1. **Orbital elements** — semi-major axis, eccentricity, inclination, period,
     perihelion/aphelion, orbit class (with description).
  2. **Close-approach history** — a list of `ApproachEntry` (date, miss distance
     via `useFormatters`, velocity), past + upcoming, most-relevant first;
     "today"/next highlighted.
  3. **Approach timeline** — `ApproachTimeline` SVG: x = year, y = miss distance
     (log-ish scale), dots colored by threat zone (reuse `getThreatLevel` +
     `useThresholds`); the closest approach emphasized. Reuses the
     `react-native-svg` idiom from the gauge/radar.
  4. **Extra metadata** — orbit class type, first/last observation dates,
     absolute magnitude.
- The share string and telescope reminder (Phase 1) are unchanged.

## Feature 3 — APOD hero banner

### Data (`src/api/apod.ts`, `src/types/apod.ts`)
- **`fetchApod(apiKey): Promise<Apod>`** → `{ date, title, explanation,
  mediaType: 'image' | 'video', imageUrl, hdImageUrl, siteUrl, copyright }`
  (`imageUrl` = `url` for images; for videos `url` is the embed link → `siteUrl`).
- **`useApod()`** (`src/hooks/useApod.ts`) — React Query, key `['apod', todayKey]`,
  24h `staleTime`, `resolveApiKey(settings)`.

### UI (`src/components/ApodBanner.tsx`, `src/screens/ApodSheet.tsx`)
- **`ApodBanner`** at the very top of `DashboardScreen` (above the header):
  compact `Image` (rounded, ~140px tall) with the title overlaid on a gradient
  scrim. **Video days:** a placeholder card "▶ Today's APOD is a video". On
  image load error or while the query is loading/errored, render nothing (no
  broken box, no layout jump beyond the banner's own space). Tap → `ApodSheet`.
- **`ApodSheet`** — modal: full image (`hdImageUrl` if present), title, date,
  copyright, scrollable explanation; video days show an "Open video" button
  (`Linking.openURL(siteUrl)`).

## Dashboard integration (`src/screens/DashboardScreen.tsx`)
- Mount `ApodBanner` above `Header`.
- Add two header icons next to the existing 📅/⚙️: a ☠️ opening `ImpactRiskSheet`.
  (APOD is reached via the banner, not an icon.)
- New modal state for `ImpactRiskSheet` and `ApodSheet`; existing `DetailSheet`
  wiring unchanged except it now also renders the `/neo/{id}` sections.

## New dependencies
- **`expo-image`** (via `npx expo install`) for efficient banner/hero image
  loading + caching. No other new deps (SVG timeline reuses `react-native-svg`).

## Testing
Unit tests (`jest-expo`) for pure functions:
- `normalizeSentry` / `fetchSentryRisks` sort + cap (mock fetch).
- `1-in-N` odds + Torino→color mapping.
- `normalizeNeoDetail` orbital-data + approach parsing/sort (mock fetch).
- `normalizeApod` incl. the video-vs-image branch (mock fetch).
- `ApproachTimeline` data→coordinate math (pure helper).
UI (banners, sheets, timeline render) verified via `tsc --noEmit` + `expo export`
+ on-device smoke test.

## Acceptance criteria
- A ☠️ header icon opens the Impact Risk board, showing real Sentry objects
  ranked by impact probability with Torino chips; tapping one shows its risk
  detail. Works with no API key (Sentry needs none).
- Opening an asteroid's detail lazily loads and shows orbital elements, a
  past+future approach list, a timeline chart, and metadata; the existing detail
  content renders immediately regardless of that fetch's state.
- An APOD banner shows atop the dashboard; tapping expands the full image +
  explanation; video days degrade to a link-out; failures hide the banner.
- All Phase 1 features continue to work; one weekly feed request is unchanged.

## Out of scope
Phase 3 (share image card, impact simulator, scale visualizer, haptics,
onboarding) and Phase 4 (daily digest, alert threshold, watchlist, home-screen
widget).
