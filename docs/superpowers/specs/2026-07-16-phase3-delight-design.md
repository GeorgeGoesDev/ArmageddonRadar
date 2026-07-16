# Armageddon Radar — Phase 3: Delight

**Date:** 2026-07-16
**Status:** Approved design → ready for implementation plan
**Scope:** Third of four phases. This phase only. Builds on Phases 1 & 2 (merged to main).

## Goal

Five client-side "delight" features, no new data sources: a unified per-asteroid
**Impact Report** (impact simulator + to-scale visual + verdict, shareable as an
image), **haptics**, and a first-run **onboarding** carousel. Reuses the Phase 1
`SettingsProvider`, modal patterns, and `react-native-svg`.

## Product decisions (locked)

- **Structure:** the impact simulator, scale visual, and share all live in one
  **Impact Report** modal per asteroid; that report is the shareable image.
- **Impact simulator depth:** relatable headline numbers — energy (megatons),
  Hiroshima-bomb equivalents, estimated crater diameter, and a one-line severity.
- **Scale visual:** the asteroid drawn to scale beside a single **best-fit
  landmark** (reusing the existing `diameterComparisons` data), with size labels.
- **Haptics:** a **warning** buzz on hazardous/high-threat, and a **success** buzz
  on reminder-set and image-share. A Settings on/off toggle (default on).
- **Onboarding:** a skippable **3-slide** first-run carousel (Threat Gauge / live
  Radar / tap-for-Impact-Reports), shown once; "Replay intro" in Settings.

## New dependencies

`expo-haptics`, `react-native-view-shot`, `expo-sharing` (all via `npx expo install`).

## Feature 1 — Impact Report

### Physics (`src/utils/impact.ts`, pure)
`computeImpact(diameterM: number, velocityKph: number): ImpactResult` where
`ImpactResult = { energyMt: number; hiroshimas: number; craterKm: number; severity: string }`:
- radius `r = diameterM / 2`; volume `V = (4/3)·π·r³`; stony density `ρi = 3000 kg/m³`; mass `m = ρi·V`.
- velocity `v = velocityKph / 3.6` (m/s); kinetic energy `E = ½·m·v²` (J).
- `energyMt = E / 4.184e15` (1 megaton TNT = 4.184e15 J).
- `hiroshimas = energyMt / 0.015` (Hiroshima ≈ 15 kt = 0.015 MT).
- **Crater** (Collins et al. pi-scaling, vertical impact): transient
  `Dt = 1.161 · (ρi/ρt)^(1/3) · diameterM^0.78 · v^0.44 · g^-0.22` with target
  `ρt = 2500`, `g = 9.81`; final simple crater `Dc = 1.25·Dt`; `craterKm = Dc/1000`.
- **Severity** by `energyMt` buckets: `<0.001` → "Airburst — shattered windows for
  miles"; `<1` → "Levels a town"; `<100` → "Flattens a city"; `<1e4` → "Regional
  devastation"; `<1e6` → "Continental catastrophe"; else → "Mass-extinction event".

### `ImpactReport` (`src/components/ImpactReport.tsx`)
The shareable card (also rendered inside the sheet). Given an `Asteroid`, shows:
name; `💥 {energyMt} megatons · ≈ {hiroshimas} Hiroshima bombs`; `Crater ≈ {craterKm} km`;
the severity line; the `ScaleVisual`; the verdict banner (reusing `getThreatLevel`
+ `useThresholds`); and an "ARMAGEDDON RADAR" watermark. Numbers via `useFormatters`
where unit-relevant; energy/Hiroshima/crater formatted with sensible precision
(e.g. `toPrecision(2)` for large ranges).

### `ImpactReportSheet` (`src/screens/ImpactReportSheet.tsx`)
Modal opened by a "💥 Simulate impact" button added to `DetailSheet`. Wraps
`ImpactReport` in a `ViewShot`/`captureRef` ref. A **"Share image"** button
captures the report to a PNG in the cache dir and calls `expo-sharing`'s
`shareAsync(uri)`; on success fires `hapticSuccess()`. Errors surface inline; the
plain text-share on `DetailSheet` is unchanged.

## Feature 2 — Scale visual (`src/components/ScaleVisual.tsx`)
- New helper `bestFitLandmark(meters)` in `src/data/diameterComparisons.ts`
  returning `{ comparison, count }` (extracted from the existing `describeDiameter`
  selection logic; `describeDiameter` refactored to use it — no behavior change).
- SVG: the asteroid as a filled circle scaled so it and the landmark reference both
  fit the frame; the landmark rendered as a small scaled marker (emoji + a bar sized
  to its real height) at the correct relative scale; a labeled size bracket
  (`{diameterAvgM} m`) and the `≈ {count} {landmark} {emoji}` caption. Auto-scales
  to the asteroid's size.

## Feature 3 — Haptics (`src/utils/haptics.ts`)
- Wraps `expo-haptics`, each call gated on a passed `enabled` flag (from
  `settings.hapticsEnabled`):
  - `hapticWarning(enabled)` → `Haptics.notificationAsync(Warning)`.
  - `hapticSuccess(enabled)` → `Haptics.notificationAsync(Success)`.
- Triggers:
  - **Warning:** in `DashboardScreen`, once per successful day-load when the closest
    object is hazardous OR in the danger zone (`getThreatLevel(...).zone === 'danger'`),
    guarded so it fires once per `selectedDateKey`/data change; and when a hazardous
    asteroid's `DetailSheet` opens.
  - **Success:** on reminder scheduled (in `DetailSheet`'s reminder handler) and on
    successful image share (in `ImpactReportSheet`).

## Feature 4 — Onboarding (`src/components/OnboardingCarousel.tsx`)
- Three horizontally-paged slides (icon + title + one-liner): Threat Gauge, live
  Radar, tap-for-Impact-Reports. A "Skip" and a "Next → / Get started" control.
- Shown by a gate in `App.tsx`: after settings hydration, if
  `!settings.onboardingComplete`, render the carousel over the app; finishing or
  skipping calls `update({ onboardingComplete: true })`.
- `SettingsSheet` gets a **"Replay intro"** row → `update({ onboardingComplete: false })`
  and closes settings.

## Settings additions (`src/settings/settingsModel.ts`, `SettingsSheet.tsx`)
- Extend `Settings` with `hapticsEnabled: boolean` (default `true`) and
  `onboardingComplete: boolean` (default `false`); `mergeSettings` validates both
  (coerce non-booleans to the default).
- `SettingsSheet`: a **Haptics** `Switch` bound to `hapticsEnabled`, and the
  **Replay intro** row.

## Existing-file edits
- `DetailSheet.tsx`: add the "💥 Simulate impact" button (opens `ImpactReportSheet`),
  fire `hapticWarning` when a hazardous asteroid opens, and `hapticSuccess` when the
  reminder is scheduled.
- `DashboardScreen.tsx`: day-load hazardous `hapticWarning` (once per data/day).
- `App.tsx`: onboarding gate inside the hydrated `Gate` component.

## New files
```
src/utils/impact.ts, src/utils/haptics.ts
src/components/ImpactReport.tsx, ScaleVisual.tsx, OnboardingCarousel.tsx
src/screens/ImpactReportSheet.tsx
```

## Testing
Unit tests (`jest-expo`) for pure logic:
- `computeImpact` — energy/Hiroshima/crater/severity against hand-computed values
  for a known diameter+velocity, plus severity bucket boundaries.
- `bestFitLandmark` — selection for small/medium/large diameters; `describeDiameter`
  still returns its prior strings (regression).
- `mergeSettings` — the two new fields default and validate correctly; existing
  fields unaffected.
UI (Impact Report card, ScaleVisual SVG, onboarding, haptics wiring, image capture/
share) verified via `tsc --noEmit` + `expo export` + on-device.

## Acceptance criteria
- Opening an asteroid detail shows a "Simulate impact" button; it opens an Impact
  Report with energy (MT), Hiroshima equivalents, crater estimate, severity line,
  a to-scale landmark visual, and the verdict; a "Share image" button produces a
  PNG and opens the OS share sheet.
- The phone gives a warning buzz on a hazardous/danger day-load and on opening a
  hazardous asteroid, and a success buzz on reminder-set and image-share — all
  suppressed when Haptics is toggled off in Settings.
- First launch shows a skippable 3-slide intro exactly once (persisted); "Replay
  intro" in Settings shows it again.
- All Phase 1 & 2 features continue to work.

## Out of scope
Phase 4: daily digest notification, smart alert threshold, watchlist, home-screen widget.
