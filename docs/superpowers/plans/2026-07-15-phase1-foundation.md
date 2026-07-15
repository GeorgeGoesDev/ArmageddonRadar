# Armageddon Radar — Phase 1 (Foundation & Core UX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7-day forecast (day-selector + Week modal), search/sort/filter on the selected day, a Settings modal (units, in-app API key, threat thresholds, about), and persistent caching — keeping the existing modal-based architecture.

**Architecture:** One weekly NeoWs fetch feeds both the dashboard day-selector and the Week modal. A `SettingsProvider` (React Context + AsyncStorage) holds units/thresholds/API-key and exposes `useSettings`/`useFormatters`. React Query is wrapped with an AsyncStorage persister so launches render instantly and work offline. Pure logic (week parsing, list controls, formatters factory, threshold-driven threat) is unit-tested with `jest-expo`; UI is verified by typecheck + production bundle + on-device.

**Tech Stack:** React Native 0.86 / Expo SDK 57, TypeScript, NativeWind v4, TanStack Query v5, react-native-svg, expo-notifications. New: `@react-native-async-storage/async-storage`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `@react-native-community/slider`, `jest-expo` (dev).

## Global Constraints

- Node ≥ 20.19.4; install RN/Expo deps with `npx expo install` (SDK-57-compatible versions), dev-only deps with `npm install -D`.
- Velocity default unit is **km/h**; distance default unit is **lunar distances (LD)**. Never hardcode a unit in a component — read via `useFormatters()`.
- Threat defaults: `dangerLD = 1`, `safeLD = 5`. `getThreatLevel` takes thresholds as a parameter; guard `dangerLD < safeLD`.
- Keep the existing colour tokens in `src/theme/colors.ts`; SVG uses those strings, UI uses NativeWind classes.
- `.env` holds `EXPO_PUBLIC_NASA_API_KEY`; the in-app override falls back to it, which falls back to `DEMO_KEY`.
- Commit after every task. Run `npx tsc --noEmit` before every commit; it must pass.
- Verify on device with the release/dev flow already in the repo (Metro + `adb reverse tcp:8081 tcp:8081`, or a rebuild for provider-level changes).

## File map

**New**
- `src/settings/settingsModel.ts` — `Settings` type, defaults, pure `mergeSettings`, `resolveApiKey`.
- `src/settings/SettingsContext.tsx` — `SettingsProvider`, `useSettings`.
- `src/settings/useFormatters.ts` — `useFormatters`, `useThresholds`.
- `src/utils/listControls.ts` — `ListControls` type, defaults, `applyListControls`.
- `src/hooks/useNeoWeek.ts` — weekly query hook + `resolveApiKey` usage.
- `src/query/persister.ts` — AsyncStorage persister + query client.
- `src/components/DaySelector.tsx` — 7-day chip strip.
- `src/components/ListControlsBar.tsx` — search + sort + filter button.
- `src/components/FilterSheet.tsx` — filter modal (switch + 2 sliders).
- `src/screens/WeekSheet.tsx` — Week modal (bar chart).
- `src/screens/SettingsSheet.tsx` — Settings modal.
- Test files under `src/**/__tests__/*.test.ts`.

**Modified**
- `src/utils/threat.ts` — thresholds as a parameter.
- `src/utils/units.ts` — conversion helpers + `makeFormatters` factory.
- `src/api/nasa.ts` — add `fetchNeoWeek`.
- `src/data/mockNeo.ts` — add `buildMockWeek`.
- `App.tsx` — `PersistQueryClientProvider` + `SettingsProvider`.
- `src/screens/DashboardScreen.tsx` — day-selector, header icons, controls, modals, thresholds.
- `src/components/AsteroidCard.tsx`, `VerdictBanner.tsx`, `ThreatGauge.tsx`, `src/screens/DetailSheet.tsx` — use `useFormatters`/thresholds.
- `package.json` — `test` script + jest config.

---

### Task 1: Test infrastructure + dependencies

**Files:**
- Modify: `package.json`
- Create: `src/utils/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test` (jest-expo) so later tasks can add tests.

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
npx expo install @react-native-async-storage/async-storage @react-native-community/slider @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
npm install -D jest-expo jest @types/jest
```

- [ ] **Step 2: Add jest config + test script to `package.json`**

Add to `package.json` (merge into existing objects):
```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@tanstack/.*))"
    ]
  }
}
```

- [ ] **Step 3: Write a smoke test**

Create `src/utils/__tests__/smoke.test.ts`:
```ts
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm test -- src/utils/__tests__/smoke.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/utils/__tests__/smoke.test.ts
git commit -m "test: add jest-expo harness and Phase 1 dependencies"
```

---

### Task 2: Threshold-parameterized threat logic

**Files:**
- Modify: `src/utils/threat.ts`
- Test: `src/utils/__tests__/threat.test.ts`

**Interfaces:**
- Consumes: `colors` from `src/theme/colors.ts`.
- Produces: `interface ThreatThresholds { dangerLD: number; safeLD: number }`, `DEFAULT_THRESHOLDS`, and `getThreatLevel(lunar: number, thresholds?: ThreatThresholds): ThreatLevel` (unchanged `ThreatLevel` shape: `{ t, zone, verdict, shortVerdict, color }`).

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/threat.test.ts`:
```ts
import { getThreatLevel, DEFAULT_THRESHOLDS } from '../threat';

describe('getThreatLevel', () => {
  it('flags danger below dangerLD', () => {
    expect(getThreatLevel(0.5).zone).toBe('danger');
  });
  it('flags watch between danger and safe', () => {
    expect(getThreatLevel(3).zone).toBe('watch');
  });
  it('flags safe at/above safeLD', () => {
    expect(getThreatLevel(6).zone).toBe('safe');
  });
  it('respects custom thresholds', () => {
    expect(getThreatLevel(3, { dangerLD: 4, safeLD: 10 }).zone).toBe('danger');
    expect(getThreatLevel(3, DEFAULT_THRESHOLDS).zone).toBe('watch');
  });
  it('t is 1 at contact and 0 at/above safeLD', () => {
    expect(getThreatLevel(0).t).toBeCloseTo(1);
    expect(getThreatLevel(10).t).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/threat.test.ts`
Expected: FAIL (custom-thresholds cases fail; `DEFAULT_THRESHOLDS` undefined).

- [ ] **Step 3: Update `src/utils/threat.ts`**

Replace the module-level constants and function signature. Full file:
```ts
import { colors } from '../theme/colors';

export type ThreatZone = 'danger' | 'watch' | 'safe';

export interface ThreatThresholds {
  dangerLD: number;
  safeLD: number;
}

export const DEFAULT_THRESHOLDS: ThreatThresholds = { dangerLD: 1, safeLD: 5 };

export interface ThreatLevel {
  t: number;
  zone: ThreatZone;
  verdict: string;
  shortVerdict: string;
  color: string;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Maps the closest asteroid's miss distance (lunar distances) to a threat
 * level. Anything under `dangerLD` reads as red alert; anything at/above
 * `safeLD` sits fully safe.
 */
export function getThreatLevel(
  lunar: number,
  thresholds: ThreatThresholds = DEFAULT_THRESHOLDS,
): ThreatLevel {
  const { dangerLD, safeLD } = thresholds;
  const t = clamp01((safeLD - lunar) / safeLD);

  if (lunar < dangerLD) {
    return {
      t,
      zone: 'danger',
      verdict: '🚨 Lock your doors. (Just kidding, but it’s close!)',
      shortVerdict: 'Lock your doors (just kidding… mostly)',
      color: colors.threatOrange,
    };
  }
  if (lunar <= safeLD) {
    return {
      t,
      zone: 'watch',
      verdict: '👀 Keep your eyes on the skies.',
      shortVerdict: 'Keep your eyes on the skies',
      color: colors.threatYellow,
    };
  }
  return {
    t,
    zone: 'safe',
    verdict: '🛡️ Verdict: Not today, space rocks.',
    shortVerdict: 'Not today, space rocks',
    color: colors.safeGreen,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/threat.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify existing callers still compile**

Run: `npx tsc --noEmit`
Expected: PASS. (`getThreatLevel(lunar)` still valid — thresholds optional. The old `DANGER_LD`/`SAFE_LD` exports are gone; if tsc reports a reference to them, update that caller to `DEFAULT_THRESHOLDS`.)

- [ ] **Step 6: Commit**

```bash
git add src/utils/threat.ts src/utils/__tests__/threat.test.ts
git commit -m "feat: parameterize threat thresholds"
```

---

### Task 3: Unit conversion helpers + formatter factory

**Files:**
- Modify: `src/utils/units.ts`
- Test: `src/utils/__tests__/units.test.ts`

**Interfaces:**
- Produces:
  - `type DistanceUnit = 'lunar' | 'km' | 'miles'`, `type VelocityUnit = 'kph' | 'mph'`.
  - `interface UnitPrefs { distanceUnit: DistanceUnit; velocityUnit: VelocityUnit }`.
  - `interface Formatters { distanceFromLunar(lunar: number, kmValue: number, milesValue: number): string; velocity(kph: number): string; diameterRange(minM: number, maxM: number): string; int(n: number): string }`.
  - `makeFormatters(prefs: UnitPrefs): Formatters`.
  - Keep existing pure formatters used elsewhere: `formatInt`, `formatDiameterRange`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/units.test.ts`:
```ts
import { makeFormatters } from '../units';

describe('makeFormatters', () => {
  it('formats distance as lunar by default', () => {
    const f = makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' });
    expect(f.distanceFromLunar(3.4, 1_306_960, 812_100)).toBe('3.4 LD');
  });
  it('formats distance as km', () => {
    const f = makeFormatters({ distanceUnit: 'km', velocityUnit: 'kph' });
    expect(f.distanceFromLunar(3.4, 1_306_960, 812_100)).toBe('1,306,960 km');
  });
  it('formats distance as miles', () => {
    const f = makeFormatters({ distanceUnit: 'miles', velocityUnit: 'kph' });
    expect(f.distanceFromLunar(3.4, 1_306_960, 812_100)).toBe('812,100 mi');
  });
  it('formats velocity as kph or mph', () => {
    expect(makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }).velocity(66790)).toBe('66,790 km/h');
    expect(makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'mph' }).velocity(66790)).toBe('41,502 mph');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/units.test.ts`
Expected: FAIL (`makeFormatters` not exported).

- [ ] **Step 3: Update `src/utils/units.ts`**

Full file:
```ts
/** Formatting + unit conversion helpers. */

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const KM_TO_MILES = 0.621371;

export function formatInt(n: number): string {
  return nf0.format(n);
}

export function formatDiameterRange(minM: number, maxM: number): string {
  return `${nf0.format(minM)} – ${nf0.format(maxM)} m`;
}

export type DistanceUnit = 'lunar' | 'km' | 'miles';
export type VelocityUnit = 'kph' | 'mph';

export interface UnitPrefs {
  distanceUnit: DistanceUnit;
  velocityUnit: VelocityUnit;
}

export interface Formatters {
  /** Distance display given the value already known in each unit. */
  distanceFromLunar(lunar: number, kmValue: number, milesValue: number): string;
  velocity(kph: number): string;
  diameterRange(minM: number, maxM: number): string;
  int(n: number): string;
}

export function makeFormatters(prefs: UnitPrefs): Formatters {
  return {
    distanceFromLunar(lunar, kmValue, milesValue) {
      switch (prefs.distanceUnit) {
        case 'km':
          return `${nf0.format(kmValue)} km`;
        case 'miles':
          return `${nf0.format(milesValue)} mi`;
        case 'lunar':
        default:
          return `${nf1.format(lunar)} LD`;
      }
    },
    velocity(kph) {
      return prefs.velocityUnit === 'mph'
        ? `${nf0.format(kph * KM_TO_MILES)} mph`
        : `${nf0.format(kph)} km/h`;
    },
    diameterRange(minM, maxM) {
      return formatDiameterRange(minM, maxM);
    },
    int(n) {
      return nf0.format(n);
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/units.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Fix any broken imports**

Run: `npx tsc --noEmit`
Expected: PASS. If a component imported a removed function (`formatKph`, `formatMiles`, `formatLunar`, `formatKm`), leave those components for Task 11 — to keep tsc green now, re-add thin wrappers only if tsc fails:
```ts
export const formatKph = (kph: number) => makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }).velocity(kph);
export const formatMiles = (miles: number) => `${nf0.format(miles)} mi`;
export const formatLunar = (lunar: number) => `${nf1.format(lunar)} LD`;
export const formatKm = (km: number) => `${nf0.format(km)} km`;
```
(These wrappers are removed in Task 11 when components migrate.)

- [ ] **Step 6: Commit**

```bash
git add src/utils/units.ts src/utils/__tests__/units.test.ts
git commit -m "feat: add unit conversion helpers and formatter factory"
```

---

### Task 4: List controls (search / sort / filter)

**Files:**
- Create: `src/utils/listControls.ts`
- Test: `src/utils/__tests__/listControls.test.ts`

**Interfaces:**
- Produces:
  - `type SortKey = 'closest' | 'largest' | 'fastest'`.
  - `interface ListControls { search: string; sort: SortKey; hazardousOnly: boolean; minDiameterM: number; maxLunar: number }`.
  - `DEFAULT_CONTROLS: ListControls` (`{ search: '', sort: 'closest', hazardousOnly: false, minDiameterM: 0, maxLunar: Infinity }`).
  - `applyListControls(asteroids: Asteroid[], c: ListControls): Asteroid[]`.
  - `activeFilterCount(c: ListControls): number`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/listControls.test.ts`:
```ts
import { applyListControls, DEFAULT_CONTROLS, activeFilterCount } from '../listControls';
import { Asteroid } from '../../types/neo';

const mk = (over: Partial<Asteroid>): Asteroid => ({
  id: '1', name: '(x)', displayName: 'x', hazardous: false,
  diameterMinM: 10, diameterMaxM: 20, diameterAvgM: 15,
  velocityKph: 1000, missLunar: 3, missKm: 1, missMiles: 1,
  approachEpochMs: 0, approachDateFull: '', ...over,
});

const a = mk({ id: 'a', displayName: 'Apophis', missLunar: 4, diameterAvgM: 300, velocityKph: 90000, hazardous: true });
const b = mk({ id: 'b', displayName: 'Bennu', missLunar: 1, diameterAvgM: 50, velocityKph: 20000 });
const c = mk({ id: 'c', displayName: 'Ceres bit', missLunar: 8, diameterAvgM: 900, velocityKph: 5000 });

describe('applyListControls', () => {
  const all = [a, b, c];
  it('sorts closest by default', () => {
    expect(applyListControls(all, DEFAULT_CONTROLS).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('sorts largest', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sort: 'largest' }).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('sorts fastest', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sort: 'fastest' }).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('searches by name (case-insensitive)', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, search: 'ben' }).map((x) => x.id)).toEqual(['b']);
  });
  it('filters hazardous only', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, hazardousOnly: true }).map((x) => x.id)).toEqual(['a']);
  });
  it('filters by min diameter', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, minDiameterM: 100 }).map((x) => x.id)).toEqual(['a', 'c']);
  });
  it('filters by max lunar', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, maxLunar: 5 }).map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('activeFilterCount', () => {
  it('counts only active filters', () => {
    expect(activeFilterCount(DEFAULT_CONTROLS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_CONTROLS, hazardousOnly: true, minDiameterM: 100 })).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/listControls.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/utils/listControls.ts`**

```ts
import { Asteroid } from '../types/neo';

export type SortKey = 'closest' | 'largest' | 'fastest';

export interface ListControls {
  search: string;
  sort: SortKey;
  hazardousOnly: boolean;
  minDiameterM: number;
  maxLunar: number;
}

export const DEFAULT_CONTROLS: ListControls = {
  search: '',
  sort: 'closest',
  hazardousOnly: false,
  minDiameterM: 0,
  maxLunar: Infinity,
};

const SORTERS: Record<SortKey, (a: Asteroid, b: Asteroid) => number> = {
  closest: (a, b) => a.missLunar - b.missLunar,
  largest: (a, b) => b.diameterAvgM - a.diameterAvgM,
  fastest: (a, b) => b.velocityKph - a.velocityKph,
};

/** Search → filter → sort. Pure; returns a new array. */
export function applyListControls(asteroids: Asteroid[], c: ListControls): Asteroid[] {
  const q = c.search.trim().toLowerCase();
  return asteroids
    .filter((a) => (q ? a.displayName.toLowerCase().includes(q) : true))
    .filter((a) => (c.hazardousOnly ? a.hazardous : true))
    .filter((a) => a.diameterAvgM >= c.minDiameterM)
    .filter((a) => a.missLunar <= c.maxLunar)
    .sort(SORTERS[c.sort]);
}

/** Number of non-search filters currently narrowing the list (for a badge). */
export function activeFilterCount(c: ListControls): number {
  let n = 0;
  if (c.hazardousOnly) n++;
  if (c.minDiameterM > 0) n++;
  if (Number.isFinite(c.maxLunar)) n++;
  return n;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/listControls.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/listControls.ts src/utils/__tests__/listControls.test.ts
git commit -m "feat: add list controls (search/sort/filter) logic"
```

---

### Task 5: Weekly feed fetch + mock week

**Files:**
- Modify: `src/api/nasa.ts`
- Modify: `src/data/mockNeo.ts`
- Test: `src/api/__tests__/nasa.week.test.ts`

**Interfaces:**
- Consumes: existing `normalizeNeo`, `extractAsteroidsForDate`, `getLocalDateKey`, `NeoFeedResponse`.
- Produces:
  - `type NeoWeek = Record<string, Asteroid[]>` (keyed by `YYYY-MM-DD`).
  - `fetchNeoWeek(opts?: { apiKey?: string; startDate?: Date; signal?: AbortSignal }): Promise<NeoWeek>`.
  - `weekDateKeys(startDate?: Date): string[]` (7 keys).
  - `buildMockWeek(startDate?: Date): NeoWeek` (from `data/mockNeo`).

- [ ] **Step 1: Write the failing test**

Create `src/api/__tests__/nasa.week.test.ts`:
```ts
import { fetchNeoWeek, weekDateKeys } from '../nasa';

describe('weekDateKeys', () => {
  it('returns 7 consecutive local date keys', () => {
    const keys = weekDateKeys(new Date(2026, 6, 15));
    expect(keys).toEqual([
      '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18',
      '2026-07-19', '2026-07-20', '2026-07-21',
    ]);
  });
});

describe('fetchNeoWeek', () => {
  it('parses each day key into a normalized, sorted array', async () => {
    const day = '2026-07-15';
    const payload = {
      element_count: 2,
      near_earth_objects: {
        [day]: [
          neo('far', '5.0'), neo('near', '1.0'),
        ],
      },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => payload,
    }) as unknown as typeof fetch;

    const week = await fetchNeoWeek({ startDate: new Date(2026, 6, 15) });
    expect(week[day].map((a) => a.id)).toEqual(['near', 'far']); // sorted closest-first
    expect(week[day][0].missLunar).toBe(1);
  });
});

function neo(id: string, lunar: string) {
  return {
    id, neo_reference_id: id, name: `(${id})`, nasa_jpl_url: '',
    absolute_magnitude_h: 20,
    estimated_diameter: {
      kilometers: { estimated_diameter_min: 0.01, estimated_diameter_max: 0.02 },
      meters: { estimated_diameter_min: 10, estimated_diameter_max: 20 },
      miles: { estimated_diameter_min: 0, estimated_diameter_max: 0 },
      feet: { estimated_diameter_min: 0, estimated_diameter_max: 0 },
    },
    is_potentially_hazardous_asteroid: false,
    close_approach_data: [{
      close_approach_date: '2026-07-15', close_approach_date_full: '2026-Jul-15 12:00',
      epoch_date_close_approach: 0,
      relative_velocity: { kilometers_per_second: '1', kilometers_per_hour: '3600', miles_per_hour: '2237' },
      miss_distance: { astronomical: '0', lunar, kilometers: '1', miles: '1' },
      orbiting_body: 'Earth',
    }],
    is_sentry_object: false,
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/__tests__/nasa.week.test.ts`
Expected: FAIL (`fetchNeoWeek`/`weekDateKeys` not exported).

- [ ] **Step 3: Add to `src/api/nasa.ts`**

Append (keep existing exports; add these):
```ts
import { Asteroid, NeoFeedResponse } from '../types/neo';

export type NeoWeek = Record<string, Asteroid[]>;

/** Seven consecutive local date keys starting at `startDate` (default today). */
export function weekDateKeys(startDate: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    keys.push(getLocalDateKey(d));
  }
  return keys;
}

/**
 * Fetches the next 7 days of NEOs in a single NeoWs request and returns a
 * per-day map of normalized, closest-first asteroid arrays. Missing days are
 * present as empty arrays.
 */
export async function fetchNeoWeek({
  apiKey = DEFAULT_API_KEY,
  startDate = new Date(),
  signal,
}: { apiKey?: string; startDate?: Date; signal?: AbortSignal } = {}): Promise<NeoWeek> {
  const keys = weekDateKeys(startDate);
  const start = keys[0];
  const end = keys[keys.length - 1];
  const url =
    `${NASA_FEED_URL}?start_date=${start}&end_date=${end}` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        'NASA rate limit reached (DEMO_KEY allows ~30 requests/hour). ' +
          'Add your own API key in Settings or try again later.',
      );
    }
    throw new Error(`NASA API request failed (${res.status} ${res.statusText}).`);
  }
  const data = (await res.json()) as NeoFeedResponse;
  const byDate = data.near_earth_objects ?? {};
  const week: NeoWeek = {};
  for (const key of keys) {
    const raw = byDate[key] ?? [];
    week[key] = raw.map(normalizeNeo).sort((a, b) => a.missLunar - b.missLunar);
  }
  return week;
}
```
(`normalizeNeo`, `DEFAULT_API_KEY`, `NASA_FEED_URL`, `getLocalDateKey` already exist in this module / its imports. If `getLocalDateKey` isn't imported yet, add `import { getLocalDateKey } from '../utils/dates';`.)

- [ ] **Step 4: Add `buildMockWeek` to `src/data/mockNeo.ts`**

Append:
```ts
import { NeoWeek } from '../api/nasa';
import { weekDateKeys } from '../api/nasa';

/** Mock week: today has the full seed list; later days get a shuffled subset. */
export function buildMockWeek(startDate: Date = new Date()): NeoWeek {
  const keys = weekDateKeys(startDate);
  const week: NeoWeek = {};
  keys.forEach((key, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const all = getMockAsteroids(d);
    // Vary count per day so the Week view looks alive.
    week[key] = all.slice(0, Math.max(1, all.length - i));
  });
  return week;
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/api/__tests__/nasa.week.test.ts && npx tsc --noEmit`
Expected: PASS (2 tests), tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/api/nasa.ts src/data/mockNeo.ts src/api/__tests__/nasa.week.test.ts
git commit -m "feat: add weekly NeoWs fetch and mock week"
```

---

### Task 6: Settings model (pure) + provider

**Files:**
- Create: `src/settings/settingsModel.ts`
- Create: `src/settings/SettingsContext.tsx`
- Test: `src/settings/__tests__/settingsModel.test.ts`

**Interfaces:**
- Produces:
  - `interface Settings { distanceUnit: DistanceUnit; velocityUnit: VelocityUnit; dangerLD: number; safeLD: number; apiKeyOverride: string | null }`.
  - `DEFAULT_SETTINGS: Settings`.
  - `mergeSettings(stored: unknown): Settings` (validates + fills defaults, enforces `dangerLD < safeLD`).
  - `resolveApiKey(settings: Settings): string` (`apiKeyOverride?.trim() || DEFAULT_API_KEY`).
  - `SettingsProvider` component, `useSettings(): { settings, update(p: Partial<Settings>): void, hydrated: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `src/settings/__tests__/settingsModel.test.ts`:
```ts
import { mergeSettings, DEFAULT_SETTINGS, resolveApiKey } from '../settingsModel';

describe('mergeSettings', () => {
  it('returns defaults for empty/invalid input', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid stored fields', () => {
    const s = mergeSettings({ distanceUnit: 'km', velocityUnit: 'mph', dangerLD: 2, safeLD: 8, apiKeyOverride: 'K' });
    expect(s).toEqual({ distanceUnit: 'km', velocityUnit: 'mph', dangerLD: 2, safeLD: 8, apiKeyOverride: 'K' });
  });
  it('rejects invalid unit values', () => {
    expect(mergeSettings({ distanceUnit: 'furlongs' }).distanceUnit).toBe('lunar');
  });
  it('enforces dangerLD < safeLD', () => {
    const s = mergeSettings({ dangerLD: 9, safeLD: 4 });
    expect(s.dangerLD).toBeLessThan(s.safeLD);
  });
});

describe('resolveApiKey', () => {
  it('uses override when present, else default', () => {
    expect(resolveApiKey({ ...DEFAULT_SETTINGS, apiKeyOverride: '  MYKEY ' })).toBe('MYKEY');
    expect(resolveApiKey({ ...DEFAULT_SETTINGS, apiKeyOverride: null })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/settings/__tests__/settingsModel.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/settings/settingsModel.ts`**

```ts
import { DistanceUnit, VelocityUnit } from '../utils/units';
import { DEFAULT_API_KEY } from '../api/nasa';

export interface Settings {
  distanceUnit: DistanceUnit;
  velocityUnit: VelocityUnit;
  dangerLD: number;
  safeLD: number;
  apiKeyOverride: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  distanceUnit: 'lunar',
  velocityUnit: 'kph',
  dangerLD: 1,
  safeLD: 5,
  apiKeyOverride: null,
};

const DIST: DistanceUnit[] = ['lunar', 'km', 'miles'];
const VEL: VelocityUnit[] = ['kph', 'mph'];

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Validates arbitrary stored JSON into a complete Settings object. */
export function mergeSettings(stored: unknown): Settings {
  const s = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>;
  let dangerLD = num(s.dangerLD, DEFAULT_SETTINGS.dangerLD);
  let safeLD = num(s.safeLD, DEFAULT_SETTINGS.safeLD);
  if (dangerLD >= safeLD) {
    dangerLD = DEFAULT_SETTINGS.dangerLD;
    safeLD = DEFAULT_SETTINGS.safeLD;
  }
  return {
    distanceUnit: DIST.includes(s.distanceUnit as DistanceUnit) ? (s.distanceUnit as DistanceUnit) : DEFAULT_SETTINGS.distanceUnit,
    velocityUnit: VEL.includes(s.velocityUnit as VelocityUnit) ? (s.velocityUnit as VelocityUnit) : DEFAULT_SETTINGS.velocityUnit,
    dangerLD,
    safeLD,
    apiKeyOverride: typeof s.apiKeyOverride === 'string' && s.apiKeyOverride.trim() ? s.apiKeyOverride : null,
  };
}

export function resolveApiKey(settings: Settings): string {
  return settings.apiKeyOverride?.trim() || DEFAULT_API_KEY;
}
```

- [ ] **Step 4: Create `src/settings/SettingsContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, mergeSettings, Settings } from './settingsModel';

const STORAGE_KEY = 'armageddon-radar/settings/v1';

interface SettingsContextValue {
  settings: Settings;
  hydrated: boolean;
  update: (partial: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setSettings(mergeSettings(raw ? JSON.parse(raw) : undefined));
      } catch {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      update: (partial) =>
        setSettings((prev) => {
          const next = mergeSettings({ ...prev, ...partial });
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [settings, hydrated],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/settings/__tests__/settingsModel.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests), tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/settings/ && git commit -m "feat: add settings model and provider with persistence"
```

---

### Task 7: Formatter + threshold hooks

**Files:**
- Create: `src/settings/useFormatters.ts`

**Interfaces:**
- Consumes: `useSettings`, `makeFormatters`, `ThreatThresholds`.
- Produces:
  - `useFormatters(): Formatters` — `makeFormatters` bound to current unit settings.
  - `useThresholds(): ThreatThresholds` — `{ dangerLD, safeLD }` from settings.

- [ ] **Step 1: Create `src/settings/useFormatters.ts`**

```ts
import { useMemo } from 'react';
import { useSettings } from './SettingsContext';
import { Formatters, makeFormatters } from '../utils/units';
import { ThreatThresholds } from '../utils/threat';

export function useFormatters(): Formatters {
  const { settings } = useSettings();
  return useMemo(
    () => makeFormatters({ distanceUnit: settings.distanceUnit, velocityUnit: settings.velocityUnit }),
    [settings.distanceUnit, settings.velocityUnit],
  );
}

export function useThresholds(): ThreatThresholds {
  const { settings } = useSettings();
  return useMemo(
    () => ({ dangerLD: settings.dangerLD, safeLD: settings.safeLD }),
    [settings.dangerLD, settings.safeLD],
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/settings/useFormatters.ts
git commit -m "feat: add useFormatters and useThresholds hooks"
```

---

### Task 8: Query persistence + provider wiring

**Files:**
- Create: `src/query/persister.ts`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `queryClient` and `asyncPersister` from `src/query/persister.ts`.
- Consumes: `SettingsProvider`.

- [ ] **Step 1: Create `src/query/persister.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const ONE_DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: ONE_DAY, gcTime: ONE_DAY, retry: 1, refetchOnWindowFocus: false },
  },
});

export const asyncPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'armageddon-radar/query-cache/v1',
});
```

- [ ] **Step 2: Update `App.tsx`**

Full file:
```tsx
import './global.css';

import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { configureNotifications } from './src/utils/notifications';
import { SettingsProvider } from './src/settings/SettingsContext';
import { queryClient, asyncPersister } from './src/query/persister';

configureNotifications();

const ONE_DAY = 24 * 60 * 60 * 1000;

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncPersister, maxAge: ONE_DAY, buster: 'v1' }}
    >
      <SettingsProvider>
        <SafeAreaProvider>
          <DashboardScreen />
        </SafeAreaProvider>
      </SettingsProvider>
    </PersistQueryClientProvider>
  );
}
```

- [ ] **Step 3: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 4: Commit**

```bash
git add src/query/persister.ts App.tsx
git commit -m "feat: persist query cache and wire settings provider"
```

---

### Task 9: useNeoWeek hook

**Files:**
- Create: `src/hooks/useNeoWeek.ts`

**Interfaces:**
- Consumes: `fetchNeoWeek`, `NeoWeek`, `buildMockWeek`, `useSettings`, `resolveApiKey`, `getLocalDateKey`.
- Produces: `useNeoWeek(opts?: { useMock?: boolean }): UseQueryResult<NeoWeek, Error>`.

- [ ] **Step 1: Create `src/hooks/useNeoWeek.ts`**

```ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchNeoWeek, NeoWeek } from '../api/nasa';
import { buildMockWeek } from '../data/mockNeo';
import { getLocalDateKey } from '../utils/dates';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useNeoWeek({ useMock = false }: { useMock?: boolean } = {}): UseQueryResult<NeoWeek, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  const startKey = getLocalDateKey();

  return useQuery<NeoWeek, Error>({
    queryKey: ['neo-week', startKey, useMock ? 'mock' : apiKey],
    queryFn: async ({ signal }) => {
      if (useMock) return buildMockWeek();
      return fetchNeoWeek({ apiKey, signal });
    },
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNeoWeek.ts
git commit -m "feat: add useNeoWeek query hook"
```

---

### Task 10: DaySelector component

**Files:**
- Create: `src/components/DaySelector.tsx`

**Interfaces:**
- Consumes: `NeoWeek`, `getThreatLevel`, `useThresholds`, `colors`.
- Produces: `DaySelector({ week, selectedDateKey, onSelect }: { week: NeoWeek; selectedDateKey: string; onSelect: (key: string) => void })`.

- [ ] **Step 1: Create `src/components/DaySelector.tsx`**

```tsx
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NeoWeek } from '../api/nasa';
import { colors } from '../theme/colors';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';

interface Props {
  week: NeoWeek;
  selectedDateKey: string;
  onSelect: (key: string) => void;
}

function closestLunar(list: NeoWeek[string]): number | null {
  if (!list || list.length === 0) return null;
  return list.reduce((m, a) => Math.min(m, a.missLunar), Infinity);
}

function weekdayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short' });
}

export function DaySelector({ week, selectedDateKey, onSelect }: Props) {
  const thresholds = useThresholds();
  const keys = Object.keys(week);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {keys.map((key) => {
        const closest = closestLunar(week[key]);
        const selected = key === selectedDateKey;
        const zoneColor = closest === null ? colors.textMuted : getThreatLevel(closest, thresholds).color;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            className="rounded-2xl px-3 py-2 items-center"
            style={{
              backgroundColor: selected ? colors.spaceSlate : colors.charcoal,
              borderWidth: 1.5,
              borderColor: selected ? zoneColor : colors.gridLineFaint,
              minWidth: 60,
            }}
          >
            <Text className="text-[11px] uppercase" style={{ color: colors.textMuted }}>
              {weekdayLabel(key)}
            </Text>
            <View className="h-1.5 w-1.5 rounded-full my-1" style={{ backgroundColor: zoneColor }} />
            <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
              {closest === null ? '—' : `${closest.toFixed(1)}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/DaySelector.tsx
git commit -m "feat: add day-selector strip component"
```

---

### Task 11: Migrate display components to hooks

**Files:**
- Modify: `src/components/AsteroidCard.tsx`, `src/components/VerdictBanner.tsx`, `src/components/ThreatGauge.tsx`, `src/screens/DetailSheet.tsx`
- Modify: `src/utils/units.ts` (remove temporary wrappers from Task 3 Step 5 if added)

**Interfaces:**
- Consumes: `useFormatters`, `useThresholds`.
- All four components now format via `useFormatters()` and pass `useThresholds()` into `getThreatLevel`.

- [ ] **Step 1: Update `AsteroidCard.tsx`**

Replace the fixed formatter imports/usage. At top, replace `import { formatDiameterRange, formatKph, formatLunar, formatMiles } from '../utils/units';` with:
```tsx
import { useFormatters } from '../settings/useFormatters';
```
Inside the component body add `const fmt = useFormatters();` and change the three metric rows to:
```tsx
<Metric icon="speedometer" label="Velocity" value={fmt.velocity(asteroid.velocityKph)} highlight={selected} />
<Metric icon="arrow-expand-horizontal" label="Diameter" value={fmt.diameterRange(asteroid.diameterMinM, asteroid.diameterMaxM)} highlight={selected} />
```
```tsx
<Metric icon="moon-waning-crescent" label="Miss" value={fmt.distanceFromLunar(asteroid.missLunar, asteroid.missKm, asteroid.missMiles)} highlight={selected} />
<Metric icon="earth" label="Approach" value={new Date(asteroid.approachEpochMs).toLocaleDateString([], { day: '2-digit', month: 'short' })} highlight={selected} />
```

- [ ] **Step 2: Update `VerdictBanner.tsx`**

Add `import { useThresholds } from '../settings/useFormatters';`, then inside: `const thresholds = useThresholds();` and change `getThreatLevel(lunar)` to `getThreatLevel(lunar, thresholds)`.

- [ ] **Step 3: Update `ThreatGauge.tsx`**

Add `import { useThresholds } from '../settings/useFormatters';`, `const thresholds = useThresholds();`, and change `getThreatLevel(lunar)` to `getThreatLevel(lunar, thresholds)`.

- [ ] **Step 4: Update `DetailSheet.tsx`**

Add `import { useFormatters, useThresholds } from '../settings/useFormatters';`. Replace fixed formatter imports. Inside: `const fmt = useFormatters(); const thresholds = useThresholds();`. Change `getThreatLevel(asteroid.missLunar)` → `getThreatLevel(asteroid.missLunar, thresholds)`. Replace `formatKph(...)`→`fmt.velocity(...)`, `formatMiles(...)`→`fmt.distanceFromLunar(asteroid.missLunar, asteroid.missKm, asteroid.missMiles)` for the miss row, `formatKm`/`formatLunar` usages → the appropriate `fmt.*`. Keep `formatInt` from units for the share string (miles + kph stay explicit KPH there per existing behavior).

- [ ] **Step 5: Remove temporary wrappers**

If Task 3 Step 5 added `formatKph`/`formatMiles`/`formatLunar`/`formatKm` wrappers, delete them from `src/utils/units.ts` now that no component imports them.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no unresolved imports).

- [ ] **Step 7: Commit**

```bash
git add src/components/AsteroidCard.tsx src/components/VerdictBanner.tsx src/components/ThreatGauge.tsx src/screens/DetailSheet.tsx src/utils/units.ts
git commit -m "refactor: format via useFormatters and pass thresholds"
```

---

### Task 12: ListControlsBar + FilterSheet

**Files:**
- Create: `src/components/FilterSheet.tsx`
- Create: `src/components/ListControlsBar.tsx`

**Interfaces:**
- Consumes: `ListControls`, `SortKey`, `activeFilterCount`, `@react-native-community/slider`, `colors`.
- Produces:
  - `FilterSheet({ visible, controls, onChange, onClose })`.
  - `ListControlsBar({ controls, onChange })` where `onChange: (c: ListControls) => void`.

- [ ] **Step 1: Create `src/components/FilterSheet.tsx`**

```tsx
import React from 'react';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../theme/colors';
import { ListControls } from '../utils/listControls';

interface Props {
  visible: boolean;
  controls: ListControls;
  onChange: (c: ListControls) => void;
  onClose: () => void;
}

const MAX_LUNAR_CAP = 20;

export function FilterSheet({ visible, controls, onChange, onClose }: Props) {
  const distanceValue = Number.isFinite(controls.maxLunar) ? controls.maxLunar : MAX_LUNAR_CAP;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl px-5 pt-4 pb-8"
          style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder }}
        >
          <View className="items-center mb-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.textMuted }} />
          </View>
          <Text className="text-lg font-bold mb-4" style={{ color: colors.textPrimary }}>Filters</Text>

          <View className="flex-row items-center justify-between mb-5">
            <Text style={{ color: colors.textPrimary }}>Hazardous only</Text>
            <Switch
              value={controls.hazardousOnly}
              onValueChange={(v) => onChange({ ...controls, hazardousOnly: v })}
              trackColor={{ true: colors.threatOrange, false: colors.spaceSlate }}
            />
          </View>

          <Text className="mb-1" style={{ color: colors.textMuted }}>
            Min diameter: {controls.minDiameterM} m
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={500}
            step={10}
            value={controls.minDiameterM}
            onValueChange={(v) => onChange({ ...controls, minDiameterM: Math.round(v) })}
            minimumTrackTintColor={colors.accentBlue}
            maximumTrackTintColor={colors.spaceSlate}
            thumbTintColor={colors.accentBlue}
          />

          <Text className="mt-4 mb-1" style={{ color: colors.textMuted }}>
            Within: {distanceValue >= MAX_LUNAR_CAP ? 'any' : `${distanceValue.toFixed(1)} LD`}
          </Text>
          <Slider
            minimumValue={0.5}
            maximumValue={MAX_LUNAR_CAP}
            step={0.5}
            value={distanceValue}
            onValueChange={(v) => onChange({ ...controls, maxLunar: v >= MAX_LUNAR_CAP ? Infinity : v })}
            minimumTrackTintColor={colors.accentBlue}
            maximumTrackTintColor={colors.spaceSlate}
            thumbTintColor={colors.accentBlue}
          />

          <Pressable
            onPress={onClose}
            className="mt-6 rounded-2xl py-3 items-center"
            style={{ backgroundColor: colors.accentBlue }}
          >
            <Text className="font-bold" style={{ color: colors.spaceBlack }}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 2: Create `src/components/ListControlsBar.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { activeFilterCount, ListControls, SortKey } from '../utils/listControls';
import { FilterSheet } from './FilterSheet';

const SORT_ORDER: SortKey[] = ['closest', 'largest', 'fastest'];
const SORT_LABEL: Record<SortKey, string> = { closest: 'Closest', largest: 'Largest', fastest: 'Fastest' };

export function ListControlsBar({ controls, onChange }: { controls: ListControls; onChange: (c: ListControls) => void }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filters = activeFilterCount(controls);

  const cycleSort = () => {
    const next = SORT_ORDER[(SORT_ORDER.indexOf(controls.sort) + 1) % SORT_ORDER.length];
    onChange({ ...controls, sort: next });
  };

  return (
    <View className="px-4 flex-row items-center" style={{ gap: 8 }}>
      <View
        className="flex-1 flex-row items-center rounded-xl px-3"
        style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}
      >
        <MaterialCommunityIcons name="magnify" size={16} color={colors.textMuted} />
        <TextInput
          value={controls.search}
          onChangeText={(t) => onChange({ ...controls, search: t })}
          placeholder="Search"
          placeholderTextColor={colors.textMuted}
          className="flex-1 ml-2 py-2 text-sm"
          style={{ color: colors.textPrimary }}
        />
      </View>

      <Pressable onPress={cycleSort} className="rounded-xl px-3 py-2 flex-row items-center" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}>
        <MaterialCommunityIcons name="sort" size={16} color={colors.accentBlue} />
        <Text className="ml-1 text-xs" style={{ color: colors.textPrimary }}>{SORT_LABEL[controls.sort]}</Text>
      </Pressable>

      <Pressable onPress={() => setFilterOpen(true)} className="rounded-xl px-3 py-2 flex-row items-center" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: filters > 0 ? colors.accentBlue : colors.gridLineFaint }}>
        <MaterialCommunityIcons name="tune-variant" size={16} color={filters > 0 ? colors.accentBlue : colors.textMuted} />
        {filters > 0 && <Text className="ml-1 text-xs font-bold" style={{ color: colors.accentBlue }}>{filters}</Text>}
      </Pressable>

      <FilterSheet visible={filterOpen} controls={controls} onChange={onChange} onClose={() => setFilterOpen(false)} />
    </View>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/FilterSheet.tsx src/components/ListControlsBar.tsx
git commit -m "feat: add list controls bar and filter sheet"
```

---

### Task 13: WeekSheet modal

**Files:**
- Create: `src/screens/WeekSheet.tsx`

**Interfaces:**
- Consumes: `NeoWeek`, `getThreatLevel`, `useThresholds`, `colors`.
- Produces: `WeekSheet({ visible, week, onClose, onSelectDay }: { visible: boolean; week: NeoWeek; onClose: () => void; onSelectDay: (key: string) => void })`.

- [ ] **Step 1: Create `src/screens/WeekSheet.tsx`**

```tsx
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NeoWeek } from '../api/nasa';
import { colors } from '../theme/colors';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';

const MAX_BAR_LD = 15;

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: '2-digit' });
}

export function WeekSheet({ visible, week, onClose, onSelectDay }: { visible: boolean; week: NeoWeek; onClose: () => void; onSelectDay: (key: string) => void }) {
  const thresholds = useThresholds();
  const keys = Object.keys(week);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '85%' }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>Week ahead</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          {keys.map((key) => {
            const list = week[key];
            const closest = list.length ? list.reduce((m, a) => Math.min(m, a.missLunar), Infinity) : null;
            const hazardous = list.some((a) => a.hazardous);
            const zoneColor = closest === null ? colors.textMuted : getThreatLevel(closest, thresholds).color;
            const pct = closest === null ? 0 : Math.max(6, 100 - Math.min(100, (closest / MAX_BAR_LD) * 100));
            return (
              <Pressable key={key} onPress={() => { onSelectDay(key); onClose(); }} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs" style={{ color: colors.textPrimary }}>
                    {dayLabel(key)} {hazardous ? '⚠️' : ''}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {closest === null ? 'clear' : `${closest.toFixed(1)} LD`}
                  </Text>
                </View>
                <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.charcoal }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: zoneColor, borderRadius: 999 }} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/WeekSheet.tsx
git commit -m "feat: add week overview modal"
```

---

### Task 14: SettingsSheet modal

**Files:**
- Create: `src/screens/SettingsSheet.tsx`

**Interfaces:**
- Consumes: `useSettings`, `useQueryClient` (from `@tanstack/react-query`), `Slider`, `expo-constants`, `Linking`, `colors`.
- Produces: `SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void })`.

- [ ] **Step 1: Create `src/screens/SettingsSheet.tsx`**

```tsx
import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSettings } from '../settings/SettingsContext';
import { DistanceUnit, VelocityUnit } from '../utils/units';

const REPO_URL = 'https://github.com/GeorgeGoesDev/ArmageddonRadar';

function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View className="flex-row rounded-xl overflow-hidden" style={{ borderWidth: 1, borderColor: colors.gridLineFaint }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} className="flex-1 py-2 items-center" style={{ backgroundColor: active ? colors.accentBlue : colors.charcoal }}>
            <Text className="text-xs font-semibold" style={{ color: active ? colors.spaceBlack : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const queryClient = useQueryClient();
  const [keyDraft, setKeyDraft] = useState(settings.apiKeyOverride ?? '');

  const saveKey = () => {
    update({ apiKeyOverride: keyDraft.trim() || null });
    queryClient.invalidateQueries({ queryKey: ['neo-week'] });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>Settings</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
            <Text className="mt-3 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Distance unit</Text>
            <Segmented<DistanceUnit>
              options={[{ key: 'lunar', label: 'Lunar' }, { key: 'km', label: 'km' }, { key: 'miles', label: 'miles' }]}
              value={settings.distanceUnit}
              onChange={(v) => update({ distanceUnit: v })}
            />

            <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Velocity unit</Text>
            <Segmented<VelocityUnit>
              options={[{ key: 'kph', label: 'km/h' }, { key: 'mph', label: 'mph' }]}
              value={settings.velocityUnit}
              onChange={(v) => update({ velocityUnit: v })}
            />

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Threat thresholds</Text>
            <Text className="mb-1 text-xs" style={{ color: colors.textMuted }}>Red alert under {settings.dangerLD.toFixed(1)} LD</Text>
            <Slider minimumValue={0.2} maximumValue={Math.min(3, settings.safeLD - 0.5)} step={0.1} value={settings.dangerLD} onValueChange={(v) => update({ dangerLD: Math.round(v * 10) / 10 })} minimumTrackTintColor={colors.threatOrange} maximumTrackTintColor={colors.spaceSlate} thumbTintColor={colors.threatOrange} />
            <Text className="mt-2 mb-1 text-xs" style={{ color: colors.textMuted }}>Completely safe above {settings.safeLD.toFixed(1)} LD</Text>
            <Slider minimumValue={Math.max(3, settings.dangerLD + 0.5)} maximumValue={15} step={0.5} value={settings.safeLD} onValueChange={(v) => update({ safeLD: Math.round(v * 2) / 2 })} minimumTrackTintColor={colors.safeGreen} maximumTrackTintColor={colors.spaceSlate} thumbTintColor={colors.safeGreen} />

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>NASA API key</Text>
            <TextInput value={keyDraft} onChangeText={setKeyDraft} placeholder="DEMO_KEY (built-in)" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} className="rounded-xl px-3 py-2 text-sm" style={{ color: colors.textPrimary, backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }} />
            <Pressable onPress={saveKey} className="mt-2 rounded-xl py-2 items-center" style={{ backgroundColor: colors.accentPurple }}>
              <Text className="font-bold" style={{ color: colors.textPrimary }}>Save key</Text>
            </Pressable>

            <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>About</Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>Armageddon Radar v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Data: NASA NeoWs (api.nasa.gov)</Text>
            <Pressable onPress={() => Linking.openURL(REPO_URL)} className="mt-1">
              <Text className="text-xs" style={{ color: colors.accentBlue }}>Source on GitHub</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettingsSheet.tsx
git commit -m "feat: add settings modal"
```

---

### Task 15: Dashboard integration

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `useNeoWeek`, `useSettings`, `useThresholds`, `DaySelector`, `ListControlsBar`, `WeekSheet`, `SettingsSheet`, `applyListControls`, `DEFAULT_CONTROLS`, `getLocalDateKey`.

- [ ] **Step 1: Rewrite `DashboardScreen.tsx`**

Full file:
```tsx
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNeoWeek } from '../hooks/useNeoWeek';
import { Asteroid } from '../types/neo';
import { colors } from '../theme/colors';
import { getLocalDateKey } from '../utils/dates';
import { ThreatGauge } from '../components/ThreatGauge';
import { VerdictBanner } from '../components/VerdictBanner';
import { RadarView } from '../components/RadarView';
import { AsteroidCard } from '../components/AsteroidCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { DaySelector } from '../components/DaySelector';
import { ListControlsBar } from '../components/ListControlsBar';
import { DetailSheet } from './DetailSheet';
import { WeekSheet } from './WeekSheet';
import { SettingsSheet } from './SettingsSheet';
import { applyListControls, DEFAULT_CONTROLS, ListControls } from '../utils/listControls';

function Header({ onWeek, onSettings }: { onWeek: () => void; onSettings: () => void }) {
  return (
    <View className="px-4 pt-2 pb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons name="radar" size={24} color={colors.accentBlue} />
          <Text className="ml-2 text-xl font-extrabold tracking-widest" style={{ color: colors.textPrimary }}>ARMAGEDDON RADAR</Text>
        </View>
        <Pressable onPress={onWeek} hitSlop={8} className="ml-2"><MaterialCommunityIcons name="calendar-week" size={22} color={colors.accentBlue} /></Pressable>
        <Pressable onPress={onSettings} hitSlop={8} className="ml-4"><MaterialCommunityIcons name="cog" size={22} color={colors.accentBlue} /></Pressable>
      </View>
      <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>Your daily check on how close humanity is to a surprise cosmic punch.</Text>
    </View>
  );
}

function ErrorState({ message, onRetry, onDemo }: { message: string; onRetry: () => void; onDemo: () => void }) {
  return (
    <View className="px-4 py-10 items-center">
      <MaterialCommunityIcons name="satellite-variant" size={48} color={colors.threatOrange} />
      <Text className="mt-4 text-center text-base font-semibold" style={{ color: colors.textPrimary }}>Lost contact with NASA</Text>
      <Text className="mt-2 text-center text-xs" style={{ color: colors.textMuted }}>{message}</Text>
      <View className="flex-row mt-5">
        <Pressable onPress={onRetry} className="rounded-xl px-5 py-3 mr-3" style={{ backgroundColor: colors.accentBlue }}><Text className="font-bold" style={{ color: colors.spaceBlack }}>Retry</Text></Pressable>
        <Pressable onPress={onDemo} className="rounded-xl px-5 py-3" style={{ borderWidth: 1.5, borderColor: colors.accentBlue }}><Text className="font-bold" style={{ color: colors.accentBlue }}>Use demo data</Text></Pressable>
      </View>
    </View>
  );
}

export function DashboardScreen() {
  const [useMock, setUseMock] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controls, setControls] = useState<ListControls>(DEFAULT_CONTROLS);
  const [detailAsteroid, setDetailAsteroid] = useState<Asteroid | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [weekVisible, setWeekVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: week, isLoading, isError, error, refetch, isRefetching } = useNeoWeek({ useMock });

  const dayList = useMemo<Asteroid[]>(() => (week ? week[selectedDateKey] ?? [] : []), [week, selectedDateKey]);
  const visibleList = useMemo(() => applyListControls(dayList, controls), [dayList, controls]);
  const closest = useMemo(() => (dayList.length ? dayList.reduce((a, b) => (a.missLunar <= b.missLunar ? a : b)) : null), [dayList]);
  const effectiveSelectedId = selectedId ?? closest?.id ?? null;

  const openDetails = (a: Asteroid) => { setSelectedId(a.id); setDetailAsteroid(a); setDetailVisible(true); };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.spaceBlack }} edges={['top']}>
      <StatusBar style="light" />
      <Header onWeek={() => setWeekVisible(true)} onSettings={() => setSettingsVisible(true)} />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message={error?.message ?? 'Unknown error.'} onRetry={() => refetch()} onDemo={() => setUseMock(true)} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accentBlue} />}>
          {week && (
            <View className="mb-1">
              <DaySelector week={week} selectedDateKey={selectedDateKey} onSelect={(k) => { setSelectedDateKey(k); setSelectedId(null); }} />
            </View>
          )}

          {closest ? (
            <>
              <View className="items-center mt-2"><ThreatGauge lunar={closest.missLunar} /></View>
              <View className="px-4 mt-3"><VerdictBanner lunar={closest.missLunar} /></View>

              <Text className="px-4 mt-7 mb-2 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Live radar · tap a blip</Text>
              <View className="items-center"><RadarView asteroids={dayList} selectedId={effectiveSelectedId} onSelect={setSelectedId} /></View>

              <View className="flex-row items-center justify-between px-4 mt-7 mb-2">
                <Text className="text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Active tracking · {visibleList.length}</Text>
                {useMock && <Text className="text-[10px]" style={{ color: colors.textMuted }}>demo data</Text>}
              </View>
              <View className="mb-2"><ListControlsBar controls={controls} onChange={setControls} /></View>

              <View className="px-4 mt-2">
                {visibleList.length === 0 ? (
                  <Text className="text-center text-xs py-8" style={{ color: colors.textMuted }}>No asteroids match your filters.</Text>
                ) : (
                  visibleList.map((a) => (
                    <AsteroidCard key={a.id} asteroid={a} selected={a.id === effectiveSelectedId} onPress={() => setSelectedId(a.id)} onDetails={() => openDetails(a)} />
                  ))
                )}
              </View>
            </>
          ) : (
            <View className="px-4 py-16 items-center">
              <MaterialCommunityIcons name="shield-check" size={56} color={colors.safeGreen} />
              <Text className="mt-4 text-lg font-bold" style={{ color: colors.textPrimary }}>Clear skies</Text>
              <Text className="mt-2 text-center text-xs" style={{ color: colors.textMuted }}>No near-Earth objects tracked for this day. Enjoy the calm.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <DetailSheet asteroid={detailAsteroid} visible={detailVisible} onClose={() => setDetailVisible(false)} />
      {week && <WeekSheet visible={weekVisible} week={week} onClose={() => setWeekVisible(false)} onSelectDay={(k) => { setSelectedDateKey(k); setSelectedId(null); }} />}
      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: integrate week data, day selector, controls, and modals into dashboard"
```

---

### Task 16: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 2: Typecheck + production bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 3: On-device smoke test**

Start Metro (`npx expo start`), `adb reverse tcp:8081 tcp:8081`, open the app, and confirm:
- Day-selector switches gauge/radar/verdict/cards.
- Search, three sort modes, and all three filters work on the selected day.
- Week modal reflects per-day closest approaches and selecting a day updates the dashboard.
- Settings persist across a full app restart; units reformat all values; API-key save triggers a refetch; threshold sliders move the gauge/verdict boundaries.
- Cold launch renders instantly from cache (airplane mode shows last data).

(Provider-level changes require the app running through Metro; if testing the standalone APK, rebuild per the repo's release flow.)

- [ ] **Step 4: Commit any fixes, then done**

```bash
git add -A && git commit -m "test: Phase 1 verification pass" || echo "nothing to commit"
git push origin main
```

---

## Self-review notes

- **Spec coverage:** 7-day forecast (Tasks 5,9,10,13,15) · sort/filter/search (Tasks 4,12,15) · persistent cache (Task 8) · settings incl. units/API-key/thresholds/about (Tasks 6,7,14) · refactors: units-aware formatters (Tasks 3,11) + threshold-parameterized threat (Tasks 2,11) — all covered.
- **Types are consistent** across tasks: `NeoWeek`, `Settings`, `ListControls`, `Formatters`, `ThreatThresholds`, `resolveApiKey` used with the same signatures where produced/consumed.
- **No placeholders:** every code step contains full code; every run step has an expected result.
- **Testing honesty:** pure logic is unit-tested (Tasks 2–6); UI/provider tasks are verified via `tsc` + `expo export` + on-device, which is the appropriate rigor for RN screens in this repo.
