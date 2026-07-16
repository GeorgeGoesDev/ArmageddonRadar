# Armageddon Radar — Phase 2 (Deeper Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sentry impact-risk board, a `/neo/{id}`-enhanced asteroid detail (orbital elements + approach history list + SVG timeline + metadata), and an APOD hero banner — all modal-based, reusing Phase 1's persisted React Query, settings hooks, and modal patterns.

**Architecture:** Three additive data slices, each a normalizer + fetch + React Query hook + view. Sentry uses JPL's `ssd-api.jpl.nasa.gov` (no API key); APOD and `/neo/{id}` use `api.nasa.gov` with `resolveApiKey(settings)`. Pure normalizers and the timeline math are unit-tested; UI is verified by typecheck + bundle + on-device.

**Tech Stack:** React Native 0.86 / Expo SDK 57, TypeScript, NativeWind v4, TanStack Query v5 (persisted), react-native-svg, `expo-image` (new). Tests: `jest-expo`.

## Global Constraints

- Install RN/Expo deps with `npx expo install`; dev-only deps with `npm install -D`. Node ≥ 20.19.4.
- **Sentry endpoints take NO api_key** (`https://ssd-api.jpl.nasa.gov/sentry.api`). APOD (`https://api.nasa.gov/planetary/apod`) and `/neo/{id}` (`https://api.nasa.gov/neo/rest/v1/neo/{id}`) use `resolveApiKey(useSettings().settings)` (from `src/settings/settingsModel.ts`).
- Never hardcode a unit — format distances/velocities via `useFormatters()` (`src/settings/useFormatters.ts`). Threat colors via `getThreatLevel(lunar, useThresholds())` (`src/utils/threat.ts`).
- Reuse colour tokens in `src/theme/colors.ts` for SVG/inline; NativeWind `className` for layout, matching existing components/modals (see `DetailSheet.tsx`, `WeekSheet.tsx`).
- Query cache is already persisted (Phase 1). Sentry board + APOD: `staleTime` 24h. `/neo/{id}`: `staleTime` 7d.
- Commit after every task. Run `npx tsc --noEmit` before every commit; it must pass. Run `npm test` for tasks that add tests.
- Verified API field mappings (use these EXACT source fields):
  - **Sentry summary row →** `des`, `fullname`, `ip` (str), `ps_cum` (str), `ts_max` (str), `diameter` (str, km), `n_imp` (number), `range` (str).
  - **Sentry detail summary →** adds `ps_max` (str), `energy` (str, MT), `mass` (str, kg), `v_inf` (str, km/s), `first_obs`, `last_obs`. It has **no** `range` — pass `yearRange` from the list row.
  - **`/neo/{id}` `orbital_data` →** `semi_major_axis`, `eccentricity`, `inclination`, `orbital_period`, `perihelion_distance`, `aphelion_distance`, `first_observation_date`, `last_observation_date`, `orbit_class.{orbit_class_type,orbit_class_description}` (all numeric fields are strings).
  - **`/neo/{id}` `close_approach_data[]` →** `epoch_date_close_approach` (number ms), `close_approach_date_full`, `miss_distance.{lunar,kilometers}` (str), `relative_velocity.kilometers_per_hour` (str), `orbiting_body`. Top-level `absolute_magnitude_h`, `is_potentially_hazardous_asteroid`, `name`.
  - **APOD →** `date`, `title`, `explanation`, `media_type` ('image'|'video'), `url`, `hdurl` (images only), `copyright` (optional).

## File map

**New**
- `src/types/sentry.ts` — `SentryRisk`, `SentryDetail`.
- `src/types/neoDetail.ts` — `OrbitalElements`, `ApproachEntry`, `NeoDetail`.
- `src/types/apod.ts` — `Apod`.
- `src/api/sentry.ts` — `normalizeSentryRow`, `normalizeSentryDetail`, `fetchSentryRisks`, `fetchSentryDetail`.
- `src/api/neoDetail.ts` — `normalizeNeoDetail`, `fetchNeoDetail`.
- `src/api/apod.ts` — `normalizeApod`, `fetchApod`.
- `src/utils/torino.ts` — `torinoColor`, `formatOdds`.
- `src/utils/orbitTimeline.ts` — `timelinePoints`.
- `src/hooks/useSentryRisks.ts`, `useSentryDetail.ts`, `useNeoDetail.ts`, `useApod.ts`.
- `src/components/TorinoChip.tsx`, `ApproachTimeline.tsx`, `ApodBanner.tsx`.
- `src/screens/ImpactRiskSheet.tsx`, `SentryDetailSheet.tsx`, `ApodSheet.tsx`.
- Test files under `src/**/__tests__/*.test.ts`.

**Modified**
- `src/screens/DetailSheet.tsx` — add four `/neo/{id}` sections.
- `src/screens/DashboardScreen.tsx` — mount `ApodBanner`, a ☠️ header icon, and the new modals.
- `package.json` — `expo-image` dependency.

---

### Task 1: Sentry data layer

**Files:**
- Create: `src/types/sentry.ts`, `src/api/sentry.ts`
- Test: `src/api/__tests__/sentry.test.ts`

**Interfaces:**
- Produces:
  - `interface SentryRisk { designation: string; name: string; impactProb: number; palermoCum: number; torinoMax: number; estDiameterM: number; nImpacts: number; yearRange: string }`
  - `interface SentryDetail { designation: string; name: string; impactProb: number; palermoCum: number; palermoMax: number; torinoMax: number; energyMt: number; estDiameterM: number; massKg: number; vInfKps: number; firstObs: string; lastObs: string; nImpacts: number }`
  - `normalizeSentryRow(row): SentryRisk`, `normalizeSentryDetail(summary): SentryDetail`
  - `fetchSentryRisks(limit?: number): Promise<SentryRisk[]>` (default 100, sorted by `impactProb` desc)
  - `fetchSentryDetail(des: string): Promise<SentryDetail>`

- [ ] **Step 1: Write the failing test**

Create `src/api/__tests__/sentry.test.ts`:
```ts
import { normalizeSentryRow, normalizeSentryDetail, fetchSentryRisks } from '../sentry';

describe('normalizeSentryRow', () => {
  it('parses string fields and converts diameter km→m', () => {
    const r = normalizeSentryRow({
      des: '1979 XB', fullname: '(1979 XB)', ip: '8.515158e-07', ps_cum: '-2.69',
      ts_max: '0', diameter: '0.66', n_imp: 4, range: '2056-2113',
    });
    expect(r).toEqual({
      designation: '1979 XB', name: '(1979 XB)', impactProb: 8.515158e-7,
      palermoCum: -2.69, torinoMax: 0, estDiameterM: 660, nImpacts: 4, yearRange: '2056-2113',
    });
  });
});

describe('normalizeSentryDetail', () => {
  it('parses the detail summary fields', () => {
    const d = normalizeSentryDetail({
      des: '1979 XB', fullname: '(1979 XB)', ip: '8.515158e-07', ps_cum: '-2.69',
      ps_max: '-2.99', ts_max: '0', energy: '3.234e+04', diameter: '0.66',
      mass: '3.92e+11', v_inf: '23.76', first_obs: '1979-12-11', last_obs: '1979-12-15', n_imp: 4,
    });
    expect(d.energyMt).toBeCloseTo(32340);
    expect(d.massKg).toBeCloseTo(3.92e11);
    expect(d.palermoMax).toBe(-2.99);
    expect(d.estDiameterM).toBe(660);
    expect(d.vInfKps).toBe(23.76);
  });
});

describe('fetchSentryRisks', () => {
  it('sorts by impact probability desc and caps to limit', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({
        count: 3, data: [
          { des: 'A', fullname: 'A', ip: '1e-6', ps_cum: '-3', ts_max: '0', diameter: '0.1', n_imp: 1, range: '2050' },
          { des: 'B', fullname: 'B', ip: '1e-3', ps_cum: '-1', ts_max: '1', diameter: '0.2', n_imp: 2, range: '2060' },
          { des: 'C', fullname: 'C', ip: '1e-5', ps_cum: '-2', ts_max: '0', diameter: '0.3', n_imp: 1, range: '2070' },
        ],
      }),
    }) as unknown as typeof fetch;
    const out = await fetchSentryRisks(2);
    expect(out.map((r) => r.designation)).toEqual(['B', 'C']); // highest ip first, capped to 2
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/__tests__/sentry.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/types/sentry.ts`**

```ts
export interface SentryRisk {
  designation: string;
  name: string;
  impactProb: number;
  palermoCum: number;
  torinoMax: number;
  estDiameterM: number;
  nImpacts: number;
  yearRange: string;
}

export interface SentryDetail {
  designation: string;
  name: string;
  impactProb: number;
  palermoCum: number;
  palermoMax: number;
  torinoMax: number;
  energyMt: number;
  estDiameterM: number;
  massKg: number;
  vInfKps: number;
  firstObs: string;
  lastObs: string;
  nImpacts: number;
}
```

- [ ] **Step 4: Create `src/api/sentry.ts`**

```ts
import { SentryDetail, SentryRisk } from '../types/sentry';

const SENTRY_URL = 'https://ssd-api.jpl.nasa.gov/sentry.api';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

/** Sentry gives diameter in km; the app works in metres. */
export function normalizeSentryRow(row: Record<string, unknown>): SentryRisk {
  return {
    designation: String(row.des ?? ''),
    name: String(row.fullname ?? row.des ?? ''),
    impactProb: num(row.ip),
    palermoCum: num(row.ps_cum),
    torinoMax: Math.round(num(row.ts_max)),
    estDiameterM: num(row.diameter) * 1000,
    nImpacts: Math.round(num(row.n_imp)),
    yearRange: String(row.range ?? ''),
  };
}

export function normalizeSentryDetail(s: Record<string, unknown>): SentryDetail {
  return {
    designation: String(s.des ?? ''),
    name: String(s.fullname ?? s.des ?? ''),
    impactProb: num(s.ip),
    palermoCum: num(s.ps_cum),
    palermoMax: num(s.ps_max),
    torinoMax: Math.round(num(s.ts_max)),
    energyMt: num(s.energy),
    estDiameterM: num(s.diameter) * 1000,
    massKg: num(s.mass),
    vInfKps: num(s.v_inf),
    firstObs: String(s.first_obs ?? ''),
    lastObs: String(s.last_obs ?? ''),
    nImpacts: Math.round(num(s.n_imp)),
  };
}

async function getJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Sentry API request failed (${res.status} ${res.statusText}).`);
  }
  return res.json();
}

/** Top risk-listed objects, highest cumulative impact probability first. */
export async function fetchSentryRisks(limit = 100, signal?: AbortSignal): Promise<SentryRisk[]> {
  const data = await getJson(SENTRY_URL, signal);
  const rows: Record<string, unknown>[] = data.data ?? [];
  return rows
    .map(normalizeSentryRow)
    .sort((a, b) => b.impactProb - a.impactProb)
    .slice(0, limit);
}

export async function fetchSentryDetail(des: string, signal?: AbortSignal): Promise<SentryDetail> {
  const data = await getJson(`${SENTRY_URL}?des=${encodeURIComponent(des)}`, signal);
  if (!data.summary) throw new Error(`No Sentry detail for ${des}.`);
  return normalizeSentryDetail(data.summary);
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/api/__tests__/sentry.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests), tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/types/sentry.ts src/api/sentry.ts src/api/__tests__/sentry.test.ts
git commit -m "feat: add Sentry impact-risk data layer"
```

---

### Task 2: Torino + odds helpers

**Files:**
- Create: `src/utils/torino.ts`
- Test: `src/utils/__tests__/torino.test.ts`

**Interfaces:**
- Consumes: `colors` from `src/theme/colors.ts`.
- Produces:
  - `torinoColor(level: number): string` (0 → muted, 1–4 → yellow, 5–7 → orange, 8–10 → red).
  - `formatOdds(impactProb: number): string` — `"1 in N"` (N = round(1/impactProb) with thousands separators), or `"~0"` when `impactProb <= 0`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/torino.test.ts`:
```ts
import { torinoColor, formatOdds } from '../torino';
import { colors } from '../../theme/colors';

describe('torinoColor', () => {
  it('maps levels to zone colors', () => {
    expect(torinoColor(0)).toBe(colors.textMuted);
    expect(torinoColor(3)).toBe(colors.threatYellow);
    expect(torinoColor(6)).toBe(colors.threatOrange);
    expect(torinoColor(9)).toBe('#FF1744');
  });
});

describe('formatOdds', () => {
  it('formats as 1 in N', () => {
    expect(formatOdds(1e-3)).toBe('1 in 1,000');
    expect(formatOdds(8.515158e-7)).toBe('1 in 1,174,517');
  });
  it('handles zero/negative', () => {
    expect(formatOdds(0)).toBe('~0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/torino.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/utils/torino.ts`**

```ts
import { colors } from '../theme/colors';

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Torino Scale colour: 0 calm → 10 certain collision. */
export function torinoColor(level: number): string {
  if (level >= 8) return '#FF1744';
  if (level >= 5) return colors.threatOrange;
  if (level >= 1) return colors.threatYellow;
  return colors.textMuted;
}

/** Cumulative impact probability → "1 in N" odds. */
export function formatOdds(impactProb: number): string {
  if (!Number.isFinite(impactProb) || impactProb <= 0) return '~0';
  return `1 in ${nf0.format(Math.round(1 / impactProb))}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/torino.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/torino.ts src/utils/__tests__/torino.test.ts
git commit -m "feat: add Torino-scale color and odds helpers"
```

---

### Task 3: Sentry hooks

**Files:**
- Create: `src/hooks/useSentryRisks.ts`, `src/hooks/useSentryDetail.ts`

**Interfaces:**
- Consumes: `fetchSentryRisks`, `fetchSentryDetail`, `SentryRisk`, `SentryDetail`.
- Produces: `useSentryRisks(): UseQueryResult<SentryRisk[], Error>`, `useSentryDetail(des: string | null): UseQueryResult<SentryDetail, Error>`.

- [ ] **Step 1: Create `src/hooks/useSentryRisks.ts`**

```ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchSentryRisks } from '../api/sentry';
import { SentryRisk } from '../types/sentry';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useSentryRisks(): UseQueryResult<SentryRisk[], Error> {
  return useQuery<SentryRisk[], Error>({
    queryKey: ['sentry-risks'],
    queryFn: ({ signal }) => fetchSentryRisks(100, signal),
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 2: Create `src/hooks/useSentryDetail.ts`**

```ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchSentryDetail } from '../api/sentry';
import { SentryDetail } from '../types/sentry';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function useSentryDetail(des: string | null): UseQueryResult<SentryDetail, Error> {
  return useQuery<SentryDetail, Error>({
    queryKey: ['sentry-detail', des],
    queryFn: ({ signal }) => fetchSentryDetail(des as string, signal),
    enabled: !!des,
    staleTime: SEVEN_DAYS,
    gcTime: SEVEN_DAYS,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSentryRisks.ts src/hooks/useSentryDetail.ts
git commit -m "feat: add Sentry query hooks"
```

---

### Task 4: TorinoChip component

**Files:**
- Create: `src/components/TorinoChip.tsx`

**Interfaces:**
- Consumes: `torinoColor`.
- Produces: `TorinoChip({ level }: { level: number })`.

- [ ] **Step 1: Create `src/components/TorinoChip.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { torinoColor } from '../utils/torino';
import { colors } from '../theme/colors';

export function TorinoChip({ level }: { level: number }) {
  const color = torinoColor(level);
  return (
    <View
      className="px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}22`, borderWidth: 1, borderColor: color }}
    >
      <Text className="text-[10px] font-bold" style={{ color }}>
        Torino {level}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/TorinoChip.tsx
git commit -m "feat: add Torino chip component"
```

---

### Task 5: Impact Risk board modal

**Files:**
- Create: `src/screens/ImpactRiskSheet.tsx`

**Interfaces:**
- Consumes: `useSentryRisks`, `TorinoChip`, `formatOdds`, `SentryRisk`, `colors`, `MaterialCommunityIcons`.
- Produces: `ImpactRiskSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (risk: SentryRisk) => void })`.

- [ ] **Step 1: Create `src/screens/ImpactRiskSheet.tsx`**

```tsx
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSentryRisks } from '../hooks/useSentryRisks';
import { SentryRisk } from '../types/sentry';
import { TorinoChip } from '../components/TorinoChip';
import { formatOdds } from '../utils/torino';

export function ImpactRiskSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (risk: SentryRisk) => void }) {
  const { data, isLoading, isError, error, refetch } = useSentryRisks();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>☠️ Impact Risk</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text className="px-5 pb-2 text-xs" style={{ color: colors.textMuted }}>
            NASA/JPL Sentry risk list · highest impact probability first
          </Text>

          {isLoading ? (
            <View className="py-16 items-center"><ActivityIndicator color={colors.accentBlue} /></View>
          ) : isError ? (
            <View className="py-12 items-center px-5">
              <Text className="text-center text-xs mb-4" style={{ color: colors.textMuted }}>{error?.message ?? 'Failed to load.'}</Text>
              <Pressable onPress={() => refetch()} className="rounded-xl px-5 py-3" style={{ backgroundColor: colors.accentBlue }}>
                <Text className="font-bold" style={{ color: colors.spaceBlack }}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
              {(data ?? []).map((risk, i) => (
                <Pressable key={risk.designation} onPress={() => onSelect(risk)} className="flex-row items-center py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
                  <Text className="text-xs w-6" style={{ color: colors.textMuted }}>{i + 1}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>{risk.name}</Text>
                    <Text className="text-[11px]" style={{ color: colors.accentBlue }}>{formatOdds(risk.impactProb)} · {Math.round(risk.estDiameterM)} m</Text>
                  </View>
                  <TorinoChip level={risk.torinoMax} />
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          )}
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
git add src/screens/ImpactRiskSheet.tsx
git commit -m "feat: add impact risk board modal"
```

---

### Task 6: Sentry detail modal

**Files:**
- Create: `src/screens/SentryDetailSheet.tsx`

**Interfaces:**
- Consumes: `useSentryDetail`, `SentryRisk`, `TorinoChip`, `formatOdds`, `formatInt` (`src/utils/units.ts`), `colors`.
- Produces: `SentryDetailSheet({ risk, onClose }: { risk: SentryRisk | null; onClose: () => void })` — `risk` non-null means visible; `yearRange` comes from `risk` (the detail API omits it).

- [ ] **Step 1: Create `src/screens/SentryDetailSheet.tsx`**

```tsx
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SentryRisk } from '../types/sentry';
import { useSentryDetail } from '../hooks/useSentryDetail';
import { TorinoChip } from '../components/TorinoChip';
import { formatOdds } from '../utils/torino';
import { formatInt } from '../utils/units';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
      <Text className="text-sm" style={{ color: colors.textMuted }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

const TORINO_CAPTION: Record<number, string> = {
  0: 'No unusual level of danger.',
  1: 'Routine — a pass near Earth, no cause for concern.',
};

export function SentryDetailSheet({ risk, onClose }: { risk: SentryRisk | null; onClose: () => void }) {
  const { data, isLoading, isError } = useSentryDetail(risk?.designation ?? null);
  if (!risk) return null;

  return (
    <Modal visible={!!risk} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-xl font-extrabold flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>{risk.name}</Text>
            <Pressable onPress={onClose} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} /></Pressable>
          </View>

          <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
              <TorinoChip level={risk.torinoMax} />
              <Text className="text-xs" style={{ color: colors.textMuted }}>{TORINO_CAPTION[risk.torinoMax] ?? 'Elevated — merits attention by astronomers.'}</Text>
            </View>

            <Row label="Impact probability" value={`${formatOdds(risk.impactProb)} (${(risk.impactProb * 100).toExponential(1)}%)`} />
            <Row label="Potential impacts" value={`${risk.nImpacts} between ${risk.yearRange}`} />
            <Row label="Estimated diameter" value={`${formatInt(risk.estDiameterM)} m`} />
            <Row label="Palermo (cumulative)" value={risk.palermoCum.toFixed(2)} />

            {isLoading && <View className="py-6 items-center"><ActivityIndicator color={colors.accentBlue} /></View>}
            {isError && <Text className="py-6 text-center text-xs" style={{ color: colors.textMuted }}>Extended risk data unavailable.</Text>}
            {data && (
              <>
                <Row label="Palermo (max)" value={data.palermoMax.toFixed(2)} />
                <Row label="Impact energy" value={`${formatInt(data.energyMt)} MT TNT`} />
                <Row label="Mass" value={`${data.massKg.toExponential(2)} kg`} />
                <Row label="Velocity (v∞)" value={`${data.vInfKps.toFixed(1)} km/s`} />
                <Row label="First observed" value={data.firstObs} />
                <Row label="Last observed" value={data.lastObs} />
              </>
            )}
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
git add src/screens/SentryDetailSheet.tsx
git commit -m "feat: add Sentry detail modal"
```

---

### Task 7: NeoWs /neo/{id} data layer

**Files:**
- Create: `src/types/neoDetail.ts`, `src/api/neoDetail.ts`
- Test: `src/api/__tests__/neoDetail.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_API_KEY` (`src/api/nasa.ts`).
- Produces:
  - `interface OrbitalElements { semiMajorAxisAu: number; eccentricity: number; inclinationDeg: number; orbitalPeriodDays: number; perihelionAu: number; aphelionAu: number; orbitClassType: string; orbitClassDescription: string; firstObservation: string; lastObservation: string }`
  - `interface ApproachEntry { epochMs: number; dateFull: string; missLunar: number; missKm: number; velocityKph: number; orbitingBody: string }`
  - `interface NeoDetail { id: string; name: string; absoluteMagnitude: number; isHazardous: boolean; orbital: OrbitalElements; approaches: ApproachEntry[] }`
  - `normalizeNeoDetail(raw): NeoDetail`
  - `fetchNeoDetail(id: string, apiKey?: string, signal?: AbortSignal): Promise<NeoDetail>`

- [ ] **Step 1: Write the failing test**

Create `src/api/__tests__/neoDetail.test.ts`:
```ts
import { normalizeNeoDetail } from '../neoDetail';

const raw = {
  id: '3447916', name: '(2009 DB1)', absolute_magnitude_h: 23.05, is_potentially_hazardous_asteroid: false,
  orbital_data: {
    semi_major_axis: '1.5', eccentricity: '0.4', inclination: '5.2', orbital_period: '700',
    perihelion_distance: '0.9', aphelion_distance: '2.1', first_observation_date: '2009-02-10',
    last_observation_date: '2020-01-01',
    orbit_class: { orbit_class_type: 'APO', orbit_class_description: 'Apollo' },
  },
  close_approach_data: [
    { epoch_date_close_approach: 200, close_approach_date_full: 'b', miss_distance: { lunar: '5', kilometers: '2' }, relative_velocity: { kilometers_per_hour: '10' }, orbiting_body: 'Earth' },
    { epoch_date_close_approach: 100, close_approach_date_full: 'a', miss_distance: { lunar: '3', kilometers: '1' }, relative_velocity: { kilometers_per_hour: '9' }, orbiting_body: 'Earth' },
  ],
};

describe('normalizeNeoDetail', () => {
  it('parses orbital elements and sorts approaches ascending by epoch', () => {
    const d = normalizeNeoDetail(raw);
    expect(d.orbital.semiMajorAxisAu).toBe(1.5);
    expect(d.orbital.orbitClassType).toBe('APO');
    expect(d.approaches.map((a) => a.epochMs)).toEqual([100, 200]);
    expect(d.approaches[0].missLunar).toBe(3);
    expect(d.isHazardous).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/__tests__/neoDetail.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/types/neoDetail.ts`**

```ts
export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  orbitalPeriodDays: number;
  perihelionAu: number;
  aphelionAu: number;
  orbitClassType: string;
  orbitClassDescription: string;
  firstObservation: string;
  lastObservation: string;
}

export interface ApproachEntry {
  epochMs: number;
  dateFull: string;
  missLunar: number;
  missKm: number;
  velocityKph: number;
  orbitingBody: string;
}

export interface NeoDetail {
  id: string;
  name: string;
  absoluteMagnitude: number;
  isHazardous: boolean;
  orbital: OrbitalElements;
  approaches: ApproachEntry[];
}
```

- [ ] **Step 4: Create `src/api/neoDetail.ts`**

```ts
import { NeoDetail, ApproachEntry, OrbitalElements } from '../types/neoDetail';
import { DEFAULT_API_KEY } from './nasa';

const NEO_URL = 'https://api.nasa.gov/neo/rest/v1/neo';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeNeoDetail(raw: any): NeoDetail {
  const od = raw.orbital_data ?? {};
  const orbital: OrbitalElements = {
    semiMajorAxisAu: num(od.semi_major_axis),
    eccentricity: num(od.eccentricity),
    inclinationDeg: num(od.inclination),
    orbitalPeriodDays: num(od.orbital_period),
    perihelionAu: num(od.perihelion_distance),
    aphelionAu: num(od.aphelion_distance),
    orbitClassType: String(od.orbit_class?.orbit_class_type ?? ''),
    orbitClassDescription: String(od.orbit_class?.orbit_class_description ?? ''),
    firstObservation: String(od.first_observation_date ?? ''),
    lastObservation: String(od.last_observation_date ?? ''),
  };
  const approaches: ApproachEntry[] = (raw.close_approach_data ?? [])
    .map((a: any) => ({
      epochMs: num(a.epoch_date_close_approach),
      dateFull: String(a.close_approach_date_full ?? ''),
      missLunar: num(a.miss_distance?.lunar),
      missKm: num(a.miss_distance?.kilometers),
      velocityKph: num(a.relative_velocity?.kilometers_per_hour),
      orbitingBody: String(a.orbiting_body ?? 'Earth'),
    }))
    .sort((a: ApproachEntry, b: ApproachEntry) => a.epochMs - b.epochMs);

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    absoluteMagnitude: num(raw.absolute_magnitude_h),
    isHazardous: !!raw.is_potentially_hazardous_asteroid,
    orbital,
    approaches,
  };
}

export async function fetchNeoDetail(
  id: string,
  apiKey: string = DEFAULT_API_KEY,
  signal?: AbortSignal,
): Promise<NeoDetail> {
  const res = await fetch(`${NEO_URL}/${encodeURIComponent(id)}?api_key=${encodeURIComponent(apiKey)}`, { signal });
  if (!res.ok) {
    throw new Error(`NASA lookup failed (${res.status} ${res.statusText}).`);
  }
  return normalizeNeoDetail(await res.json());
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/api/__tests__/neoDetail.test.ts && npx tsc --noEmit`
Expected: PASS (1 test), tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/types/neoDetail.ts src/api/neoDetail.ts src/api/__tests__/neoDetail.test.ts
git commit -m "feat: add NeoWs /neo/{id} detail data layer"
```

---

### Task 8: useNeoDetail hook

**Files:**
- Create: `src/hooks/useNeoDetail.ts`

**Interfaces:**
- Consumes: `fetchNeoDetail`, `NeoDetail`, `useSettings`, `resolveApiKey`.
- Produces: `useNeoDetail(id: string | null): UseQueryResult<NeoDetail, Error>`.

- [ ] **Step 1: Create `src/hooks/useNeoDetail.ts`**

```ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchNeoDetail } from '../api/neoDetail';
import { NeoDetail } from '../types/neoDetail';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function useNeoDetail(id: string | null): UseQueryResult<NeoDetail, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  return useQuery<NeoDetail, Error>({
    queryKey: ['neo-detail', id],
    queryFn: ({ signal }) => fetchNeoDetail(id as string, apiKey, signal),
    enabled: !!id,
    staleTime: SEVEN_DAYS,
    gcTime: SEVEN_DAYS,
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
git add src/hooks/useNeoDetail.ts
git commit -m "feat: add useNeoDetail hook"
```

---

### Task 9: Approach-timeline math

**Files:**
- Create: `src/utils/orbitTimeline.ts`
- Test: `src/utils/__tests__/orbitTimeline.test.ts`

**Interfaces:**
- Consumes: `ApproachEntry`.
- Produces:
  - `interface TimelinePoint { x: number; y: number; entry: ApproachEntry }`
  - `timelinePoints(approaches: ApproachEntry[], width: number, height: number): TimelinePoint[]` — x spread by epoch (min→0, max→width), y by miss distance on a log scale (closest → near bottom `height`, farthest → near top `0`), padded 6px inside each edge. Empty/one-point inputs handled.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/orbitTimeline.test.ts`:
```ts
import { timelinePoints } from '../orbitTimeline';
import { ApproachEntry } from '../../types/neoDetail';

const mk = (epochMs: number, missLunar: number): ApproachEntry => ({
  epochMs, dateFull: '', missLunar, missKm: 0, velocityKph: 0, orbitingBody: 'Earth',
});

describe('timelinePoints', () => {
  it('spreads x by epoch within [pad, width-pad]', () => {
    const pts = timelinePoints([mk(0, 5), mk(100, 5), mk(50, 5)], 100, 50);
    const xs = pts.map((p) => Math.round(p.x));
    expect(Math.min(...xs)).toBe(6);
    expect(Math.max(...xs)).toBe(94);
    // sorted by input order preserved
    expect(pts[1].entry.epochMs).toBe(100);
  });
  it('closer approaches sit lower (larger y)', () => {
    const pts = timelinePoints([mk(0, 1), mk(100, 20)], 100, 50);
    expect(pts[0].y).toBeGreaterThan(pts[1].y); // missLunar 1 is closer → larger y
  });
  it('handles a single point (centered)', () => {
    const pts = timelinePoints([mk(0, 3)], 100, 50);
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(50);
  });
  it('handles empty input', () => {
    expect(timelinePoints([], 100, 50)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/orbitTimeline.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/utils/orbitTimeline.ts`**

```ts
import { ApproachEntry } from '../types/neoDetail';

export interface TimelinePoint {
  x: number;
  y: number;
  entry: ApproachEntry;
}

const PAD = 6;

/**
 * Maps approaches to plot coordinates: x by epoch (left = earliest), y by miss
 * distance on a log scale (closer = lower on screen = larger y).
 */
export function timelinePoints(approaches: ApproachEntry[], width: number, height: number): TimelinePoint[] {
  if (approaches.length === 0) return [];

  const epochs = approaches.map((a) => a.epochMs);
  const minE = Math.min(...epochs);
  const maxE = Math.max(...epochs);
  const eSpan = maxE - minE || 1;

  const logs = approaches.map((a) => Math.log10(Math.max(0.05, a.missLunar)));
  const minL = Math.min(...logs);
  const maxL = Math.max(...logs);
  const lSpan = maxL - minL || 1;

  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;

  return approaches.map((entry) => {
    const x = approaches.length === 1 ? width / 2 : PAD + ((entry.epochMs - minE) / eSpan) * innerW;
    const l = Math.log10(Math.max(0.05, entry.missLunar));
    // Larger distance → smaller y (higher up); closer → larger y (lower).
    const y = PAD + ((maxL - l) / lSpan) * innerH;
    return { x, y, entry };
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/orbitTimeline.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/orbitTimeline.ts src/utils/__tests__/orbitTimeline.test.ts
git commit -m "feat: add approach-timeline coordinate math"
```

---

### Task 10: ApproachTimeline component

**Files:**
- Create: `src/components/ApproachTimeline.tsx`

**Interfaces:**
- Consumes: `timelinePoints`, `ApproachEntry`, `getThreatLevel`, `useThresholds`, `colors`, `react-native-svg`.
- Produces: `ApproachTimeline({ approaches, width }: { approaches: ApproachEntry[]; width: number })`.

- [ ] **Step 1: Create `src/components/ApproachTimeline.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ApproachEntry } from '../types/neoDetail';
import { timelinePoints } from '../utils/orbitTimeline';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { colors } from '../theme/colors';

export function ApproachTimeline({ approaches, width }: { approaches: ApproachEntry[]; width: number }) {
  const thresholds = useThresholds();
  const height = 120;
  const pts = timelinePoints(approaches, width, height);
  if (pts.length === 0) return null;

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const closest = pts.reduce((m, p) => (p.entry.missLunar < m.entry.missLunar ? p : m), pts[0]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - 6} x2={width} y2={height - 6} stroke={colors.gridLineFaint} strokeWidth={1} />
        {pts.length > 1 && <Path d={path} stroke={colors.gridLine} strokeWidth={1} fill="none" />}
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p === closest ? 5 : 3}
            fill={getThreatLevel(p.entry.missLunar, thresholds).color}
            stroke={colors.spaceBlack}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ApproachTimeline.tsx
git commit -m "feat: add approach timeline chart component"
```

---

### Task 11: DetailSheet enhancement

**Files:**
- Modify: `src/screens/DetailSheet.tsx`

**Interfaces:**
- Consumes: `useNeoDetail`, `ApproachTimeline`, `useFormatters`, `formatLocalDateTime` (`src/utils/dates.ts`), `formatInt`.

- [ ] **Step 1: Read the current file**

Read `src/screens/DetailSheet.tsx` fully to locate the `Orbital mechanics` section and the imports.

- [ ] **Step 2: Add imports**

At the top of `DetailSheet.tsx`, add:
```tsx
import { useNeoDetail } from '../hooks/useNeoDetail';
import { ApproachTimeline } from '../components/ApproachTimeline';
import { ActivityIndicator, useWindowDimensions } from 'react-native';
```
(Merge `ActivityIndicator`/`useWindowDimensions` into the existing `react-native` import if one already imports from it — do not create a duplicate import line. `ActivityIndicator` is likely already imported.)

- [ ] **Step 3: Call the hook**

Inside `DetailSheet`, after the existing hook calls (`useFormatters`/`useThresholds`) and BEFORE the `if (!asteroid) return null;` guard, add:
```tsx
  const { width } = useWindowDimensions();
  const detail = useNeoDetail(asteroid?.id ?? null);
```

- [ ] **Step 4: Add the four sections**

In the `ScrollView`, immediately after the existing orbital-mechanics `DataRow` block (after the `"Size, roughly"` row) and before the Reminder `Pressable`, insert:
```tsx
            {/* Extended detail from /neo/{id} */}
            {detail.isLoading && (
              <View className="py-4 items-center"><ActivityIndicator color={colors.accentBlue} /></View>
            )}
            {detail.data && (
              <>
                <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Orbital elements</Text>
                <DataRow label="Semi-major axis" value={`${detail.data.orbital.semiMajorAxisAu.toFixed(3)} AU`} />
                <DataRow label="Eccentricity" value={detail.data.orbital.eccentricity.toFixed(3)} />
                <DataRow label="Inclination" value={`${detail.data.orbital.inclinationDeg.toFixed(1)}°`} />
                <DataRow label="Orbital period" value={`${fmt.int(detail.data.orbital.orbitalPeriodDays)} days`} />
                <DataRow label="Perihelion / aphelion" value={`${detail.data.orbital.perihelionAu.toFixed(2)} / ${detail.data.orbital.aphelionAu.toFixed(2)} AU`} />
                <DataRow label="Orbit class" value={detail.data.orbital.orbitClassType} />

                {detail.data.approaches.length > 0 && (
                  <>
                    <Text className="mt-6 mb-2 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Approach timeline</Text>
                    <ApproachTimeline approaches={detail.data.approaches} width={width - 40} />
                    <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Close-approach history</Text>
                    {detail.data.approaches.slice(0, 20).map((a, i) => (
                      <View key={i} className="flex-row justify-between py-2" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
                        <Text className="text-xs" style={{ color: colors.textMuted }}>{a.dateFull}</Text>
                        <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>{fmt.distanceFromLunar(a.missLunar, a.missKm, a.missKm * 0.621371)}</Text>
                      </View>
                    ))}
                  </>
                )}

                <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>More</Text>
                <DataRow label="Orbit class detail" value={detail.data.orbital.orbitClassDescription} />
                <DataRow label="First / last observed" value={`${detail.data.orbital.firstObservation} → ${detail.data.orbital.lastObservation}`} />
                <DataRow label="Absolute magnitude (H)" value={detail.data.absoluteMagnitude.toFixed(1)} />
              </>
            )}
```

- [ ] **Step 5: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 6: Commit**

```bash
git add src/screens/DetailSheet.tsx
git commit -m "feat: enrich asteroid detail with orbital data, history, and timeline"
```

---

### Task 12: APOD data layer + expo-image

**Files:**
- Create: `src/types/apod.ts`, `src/api/apod.ts`
- Test: `src/api/__tests__/apod.test.ts`
- Modify: `package.json` (expo-image)

**Interfaces:**
- Produces:
  - `interface Apod { date: string; title: string; explanation: string; mediaType: 'image' | 'video'; imageUrl: string; hdImageUrl: string; siteUrl: string; copyright: string }`
  - `normalizeApod(raw): Apod`
  - `fetchApod(apiKey?: string, signal?: AbortSignal): Promise<Apod>`

- [ ] **Step 1: Install expo-image**

Run: `npx expo install expo-image`

- [ ] **Step 2: Write the failing test**

Create `src/api/__tests__/apod.test.ts`:
```ts
import { normalizeApod } from '../apod';

describe('normalizeApod', () => {
  it('maps an image day', () => {
    const a = normalizeApod({
      date: '2026-07-16', title: 'NGC 300', explanation: 'x', media_type: 'image',
      url: 'http://img/lo.jpg', hdurl: 'http://img/hi.jpg', copyright: 'Someone',
    });
    expect(a).toEqual({
      date: '2026-07-16', title: 'NGC 300', explanation: 'x', mediaType: 'image',
      imageUrl: 'http://img/lo.jpg', hdImageUrl: 'http://img/hi.jpg', siteUrl: 'http://img/lo.jpg', copyright: 'Someone',
    });
  });
  it('maps a video day (no imageUrl, siteUrl = url)', () => {
    const a = normalizeApod({ date: '2026-07-17', title: 'V', explanation: 'y', media_type: 'video', url: 'http://youtube/embed' });
    expect(a.mediaType).toBe('video');
    expect(a.imageUrl).toBe('');
    expect(a.siteUrl).toBe('http://youtube/embed');
    expect(a.copyright).toBe('');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/api/__tests__/apod.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Create `src/types/apod.ts`**

```ts
export interface Apod {
  date: string;
  title: string;
  explanation: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  hdImageUrl: string;
  siteUrl: string;
  copyright: string;
}
```

- [ ] **Step 5: Create `src/api/apod.ts`**

```ts
import { Apod } from '../types/apod';
import { DEFAULT_API_KEY } from './nasa';

const APOD_URL = 'https://api.nasa.gov/planetary/apod';

export function normalizeApod(raw: any): Apod {
  const isImage = raw.media_type === 'image';
  return {
    date: String(raw.date ?? ''),
    title: String(raw.title ?? ''),
    explanation: String(raw.explanation ?? ''),
    mediaType: isImage ? 'image' : 'video',
    imageUrl: isImage ? String(raw.url ?? '') : '',
    hdImageUrl: String(raw.hdurl ?? ''),
    siteUrl: String(raw.url ?? ''),
    copyright: String(raw.copyright ?? '').trim(),
  };
}

export async function fetchApod(apiKey: string = DEFAULT_API_KEY, signal?: AbortSignal): Promise<Apod> {
  const res = await fetch(`${APOD_URL}?api_key=${encodeURIComponent(apiKey)}`, { signal });
  if (!res.ok) {
    throw new Error(`APOD request failed (${res.status} ${res.statusText}).`);
  }
  return normalizeApod(await res.json());
}
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test -- src/api/__tests__/apod.test.ts && npx tsc --noEmit`
Expected: PASS (2 tests), tsc clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/types/apod.ts src/api/apod.ts src/api/__tests__/apod.test.ts
git commit -m "feat: add APOD data layer and expo-image"
```

---

### Task 13: useApod hook

**Files:**
- Create: `src/hooks/useApod.ts`

**Interfaces:**
- Consumes: `fetchApod`, `Apod`, `useSettings`, `resolveApiKey`, `getLocalDateKey`.
- Produces: `useApod(): UseQueryResult<Apod, Error>`.

- [ ] **Step 1: Create `src/hooks/useApod.ts`**

```ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchApod } from '../api/apod';
import { Apod } from '../types/apod';
import { useSettings } from '../settings/SettingsContext';
import { resolveApiKey } from '../settings/settingsModel';
import { getLocalDateKey } from '../utils/dates';

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useApod(): UseQueryResult<Apod, Error> {
  const { settings } = useSettings();
  const apiKey = resolveApiKey(settings);
  return useQuery<Apod, Error>({
    queryKey: ['apod', getLocalDateKey()],
    queryFn: ({ signal }) => fetchApod(apiKey, signal),
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
git add src/hooks/useApod.ts
git commit -m "feat: add useApod hook"
```

---

### Task 14: ApodBanner + ApodSheet

**Files:**
- Create: `src/components/ApodBanner.tsx`, `src/screens/ApodSheet.tsx`

**Interfaces:**
- Consumes: `useApod`, `Apod`, `expo-image` (`Image`), `expo-linear-gradient`, `Linking`, `colors`, `MaterialCommunityIcons`.
- Produces: `ApodBanner()` (self-contained; manages its own expand modal via `ApodSheet`).

- [ ] **Step 1: Create `src/screens/ApodSheet.tsx`**

```tsx
import React from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Apod } from '../types/apod';

export function ApodSheet({ apod, visible, onClose }: { apod: Apod | null; visible: boolean; onClose: () => void }) {
  if (!apod) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View className="rounded-t-3xl overflow-hidden" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '92%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-xs uppercase tracking-widest flex-1" style={{ color: colors.accentBlue }}>Astronomy Picture · {apod.date}</Text>
            <Pressable onPress={onClose} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {apod.mediaType === 'image' ? (
              <Image source={{ uri: apod.hdImageUrl || apod.imageUrl }} style={{ width: '100%', height: 260 }} contentFit="cover" transition={200} />
            ) : (
              <Pressable onPress={() => Linking.openURL(apod.siteUrl)} className="items-center justify-center" style={{ height: 160, backgroundColor: colors.charcoal }}>
                <MaterialCommunityIcons name="play-circle" size={48} color={colors.accentBlue} />
                <Text className="mt-2 text-xs" style={{ color: colors.accentBlue }}>Open today's video</Text>
              </Pressable>
            )}
            <View className="px-5">
              <Text className="mt-4 text-lg font-bold" style={{ color: colors.textPrimary }}>{apod.title}</Text>
              {!!apod.copyright && <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>© {apod.copyright}</Text>}
              <Text className="mt-3 text-sm leading-5" style={{ color: colors.textMuted }}>{apod.explanation}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Create `src/components/ApodBanner.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useApod } from '../hooks/useApod';
import { ApodSheet } from '../screens/ApodSheet';

export function ApodBanner() {
  const { data } = useApod();
  const [open, setOpen] = useState(false);
  if (!data) return null; // loading/error → render nothing (no layout jump)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="mx-4 mt-2 rounded-2xl overflow-hidden" style={{ height: 132, backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.cardBorder }}>
        {data.mediaType === 'image' ? (
          <Image source={{ uri: data.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <MaterialCommunityIcons name="play-circle" size={32} color={colors.accentBlue} />
            <Text className="mt-1 text-[11px]" style={{ color: colors.accentBlue }}>Today's APOD is a video</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(11,12,16,0.9)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text className="text-[10px] uppercase tracking-widest" style={{ color: colors.accentBlue }}>Astronomy Picture of the Day</Text>
          <Text className="text-sm font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>{data.title}</Text>
        </LinearGradient>
      </Pressable>
      <ApodSheet apod={data} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ApodBanner.tsx src/screens/ApodSheet.tsx
git commit -m "feat: add APOD banner and expand modal"
```

---

### Task 15: Dashboard integration

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `ApodBanner`, `ImpactRiskSheet`, `SentryDetailSheet`, `SentryRisk`.

- [ ] **Step 1: Read the current file**

Read `src/screens/DashboardScreen.tsx` fully (it was rewritten in Phase 1). Note the `Header` component and its `onWeek`/`onSettings` props, and the modal-mounting block at the bottom.

- [ ] **Step 2: Add imports**

```tsx
import { ApodBanner } from '../components/ApodBanner';
import { ImpactRiskSheet } from './ImpactRiskSheet';
import { SentryDetailSheet } from './SentryDetailSheet';
import { SentryRisk } from '../types/sentry';
```

- [ ] **Step 3: Extend the `Header` to add a risk icon**

Change the `Header` function signature to `{ onWeek, onSettings, onRisk }: { onWeek: () => void; onSettings: () => void; onRisk: () => void }` and add, immediately before the calendar `Pressable`:
```tsx
        <Pressable onPress={onRisk} hitSlop={8} className="ml-2"><MaterialCommunityIcons name="skull-outline" size={22} color={colors.threatOrange} /></Pressable>
```

- [ ] **Step 4: Add state + banner + modals in `DashboardScreen`**

Add state near the other `useState` calls:
```tsx
  const [riskVisible, setRiskVisible] = useState(false);
  const [sentryRisk, setSentryRisk] = useState<SentryRisk | null>(null);
```
Render `<ApodBanner />` as the FIRST child inside the `SafeAreaView`, before `<Header ... />`. Update the `Header` usage to pass `onRisk={() => setRiskVisible(true)}`. Then, in the bottom modal-mounting block (next to `WeekSheet`/`SettingsSheet`), add:
```tsx
      <ImpactRiskSheet visible={riskVisible} onClose={() => setRiskVisible(false)} onSelect={(r) => setSentryRisk(r)} />
      <SentryDetailSheet risk={sentryRisk} onClose={() => setSentryRisk(null)} />
```

- [ ] **Step 5: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 6: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: mount APOD banner and impact-risk board on the dashboard"
```

---

### Task 16: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites PASS (Phase 1 + the new sentry/torino/neoDetail/orbitTimeline/apod tests).

- [ ] **Step 2: Typecheck + production bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 3: On-device smoke test**

Start Metro (`npx expo start`), `adb reverse tcp:8081 tcp:8081`, open in Expo Go, and confirm:
- APOD banner appears at the top; tapping opens the full image + explanation (or a video link-out on video days).
- The ☠️ header icon opens the Impact Risk board with real Sentry objects + Torino chips; tapping one opens its risk detail (works even with no API key).
- Opening an asteroid's detail loads orbital elements, the approach timeline, the approach-history list, and metadata below the existing content; the base detail renders immediately.
- All Phase 1 behavior still works (day selector, controls, week/settings modals, gauge/radar/verdict).

- [ ] **Step 4: Commit any fixes, then done**

```bash
git add -A && git commit -m "test: Phase 2 verification pass" || echo "nothing to commit"
```

---

## Self-review notes

- **Spec coverage:** Sentry board (Tasks 1–6), enhanced detail w/ orbital + history + timeline + metadata (Tasks 7–11), APOD banner (Tasks 12–14), dashboard integration (Task 15), verification (Task 16). All spec sections covered.
- **Verified field mappings** (Global Constraints) come from live API responses, not memory: Sentry `ip/ps_cum/ts_max/n_imp/range/diameter`, detail `energy/mass/v_inf/ps_max/first_obs/last_obs` (no `range` → taken from the list row), `/neo/{id}` `orbital_data` + `close_approach_data`, APOD `url/hdurl/media_type`.
- **Type consistency:** `SentryRisk`, `SentryDetail`, `NeoDetail`/`OrbitalElements`/`ApproachEntry`, `Apod`, `TimelinePoint` used with identical signatures where produced/consumed. `SentryDetailSheet` takes the `SentryRisk` row (for `yearRange`) plus fetches `SentryDetail`.
- **No placeholders:** every code step has full code; every run step has an expected result.
- **Auth correctness:** Sentry calls carry no api_key; APOD and `/neo/{id}` use `resolveApiKey`.
- **Testing honesty:** pure normalizers + timeline math are unit-tested (Tasks 1,2,7,9,12); UI/hook tasks verified via tsc + bundle + on-device.
