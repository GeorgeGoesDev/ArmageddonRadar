# Armageddon Radar — Phase 3 (Delight) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified per-asteroid Impact Report (impact simulator + to-scale visual + shareable PNG), haptics, and a first-run onboarding carousel — all client-side, reusing Phase 1/2 patterns.

**Architecture:** Pure physics (`utils/impact.ts`) and landmark selection (`data/diameterComparisons.ts`) are unit-tested. The Impact Report is an SVG/RN card captured to PNG via `react-native-view-shot` and shared via `expo-sharing`. Haptics wrap `expo-haptics` gated on a new setting. Onboarding + the two new settings ride the existing `SettingsProvider`.

**Tech Stack:** React Native 0.86 / Expo SDK 57, TypeScript, NativeWind v4, react-native-svg, TanStack Query (persisted). New: `expo-haptics`, `react-native-view-shot`, `expo-sharing`. Tests: `jest-expo`.

## Global Constraints

- Install RN/Expo deps with `npx expo install`. Node ≥ 20.19.4.
- Physics constants (verbatim): impactor density `3000 kg/m³`, target density `2500 kg/m³`, `g = 9.81`, `1 MT TNT = 4.184e15 J`, Hiroshima `= 0.015 MT`. Crater = Collins pi-scaling transient × 1.25 (final simple crater).
- Severity buckets by `energyMt`: `<0.001` → "Airburst — shattered windows for miles"; `<1` → "Levels a town"; `<100` → "Flattens a city"; `<1e4` → "Regional devastation"; `<1e6` → "Continental catastrophe"; else → "Mass-extinction event".
- Haptics: every trigger gated on `settings.hapticsEnabled` (default `true`). Onboarding: gated on `settings.onboardingComplete` (default `false`).
- Never hardcode a unit — distances via `useFormatters()`; threat colours via `getThreatLevel(lunar, useThresholds())`. NativeWind `className` + `colors.*`, matching existing modals.
- Commit after every task. `npx tsc --noEmit` must pass before every commit; run `npm test` for tasks adding tests; run `npx expo export --platform android --output-dir dist-check` (then `rm -rf dist-check`) for tasks that add native deps or provider-level wiring.
- Verified test values (locked): `computeImpact(100, 72000)` → `energyMt≈75.09`, `hiroshimas=5006`, `craterKm≈2.645`.

## File map

**New**
- `src/utils/impact.ts` — `computeImpact`, `severityFor`.
- `src/utils/haptics.ts` — `hapticWarning`, `hapticSuccess`.
- `src/components/ScaleVisual.tsx` — to-scale asteroid-vs-landmark SVG.
- `src/components/ImpactReport.tsx` — the shareable report card.
- `src/screens/ImpactReportSheet.tsx` — modal wrapping the card + capture/share.
- `src/components/OnboardingCarousel.tsx` — 3-slide first-run intro.
- Test files under `src/**/__tests__/*.test.ts`.

**Modified**
- `src/data/diameterComparisons.ts` — extract `bestFitLandmark`; `describeDiameter` reuses it.
- `src/settings/settingsModel.ts` — add `hapticsEnabled`, `onboardingComplete`.
- `src/screens/SettingsSheet.tsx` — Haptics switch + Replay-intro row.
- `src/screens/DetailSheet.tsx` — Simulate-impact button + haptics.
- `src/screens/DashboardScreen.tsx` — day-load hazardous haptic.
- `App.tsx` — onboarding gate.
- `package.json` — three new deps.

---

### Task 1: Impact physics

**Files:**
- Create: `src/utils/impact.ts`
- Test: `src/utils/__tests__/impact.test.ts`

**Interfaces:**
- Produces:
  - `interface ImpactResult { energyMt: number; hiroshimas: number; craterKm: number; severity: string }`
  - `severityFor(energyMt: number): string`
  - `computeImpact(diameterM: number, velocityKph: number): ImpactResult`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/impact.test.ts`:
```ts
import { computeImpact, severityFor } from '../impact';

describe('computeImpact', () => {
  it('computes energy, Hiroshima equivalents, and crater for a known input', () => {
    const r = computeImpact(100, 72000); // 100 m at 20 km/s
    expect(r.energyMt).toBeCloseTo(75.09, 1);
    expect(Math.round(r.hiroshimas)).toBe(5006);
    expect(r.craterKm).toBeCloseTo(2.645, 2);
    expect(r.severity).toBe('Flattens a city');
  });
  it('scales up for a large fast body', () => {
    const r = computeImpact(747.5, 66790);
    expect(Math.round(r.energyMt)).toBe(26987);
    expect(r.severity).toBe('Continental catastrophe');
  });
});

describe('severityFor', () => {
  it('maps energy to a severity label', () => {
    expect(severityFor(0.0005)).toBe('Airburst — shattered windows for miles');
    expect(severityFor(0.5)).toBe('Levels a town');
    expect(severityFor(50)).toBe('Flattens a city');
    expect(severityFor(5000)).toBe('Regional devastation');
    expect(severityFor(500000)).toBe('Continental catastrophe');
    expect(severityFor(5000000)).toBe('Mass-extinction event');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/__tests__/impact.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/utils/impact.ts`**

```ts
export interface ImpactResult {
  energyMt: number;
  hiroshimas: number;
  craterKm: number;
  severity: string;
}

const IMPACTOR_DENSITY = 3000; // kg/m^3 (stony)
const TARGET_DENSITY = 2500;
const G = 9.81;
const JOULES_PER_MT = 4.184e15;
const HIROSHIMA_MT = 0.015;

/** Torino-independent plain-language severity by energy (megatons TNT). */
export function severityFor(energyMt: number): string {
  if (energyMt < 0.001) return 'Airburst — shattered windows for miles';
  if (energyMt < 1) return 'Levels a town';
  if (energyMt < 100) return 'Flattens a city';
  if (energyMt < 1e4) return 'Regional devastation';
  if (energyMt < 1e6) return 'Continental catastrophe';
  return 'Mass-extinction event';
}

/**
 * Relatable impact estimate from diameter (m) + speed (km/h). Kinetic energy
 * → megatons + Hiroshima equivalents; crater via Collins et al. pi-scaling
 * (vertical impact), final simple crater = 1.25 × transient.
 */
export function computeImpact(diameterM: number, velocityKph: number): ImpactResult {
  const r = diameterM / 2;
  const volume = (4 / 3) * Math.PI * r ** 3;
  const mass = IMPACTOR_DENSITY * volume;
  const v = velocityKph / 3.6; // m/s
  const energyJ = 0.5 * mass * v * v;
  const energyMt = energyJ / JOULES_PER_MT;
  const hiroshimas = energyMt / HIROSHIMA_MT;

  const transient =
    1.161 *
    Math.pow(IMPACTOR_DENSITY / TARGET_DENSITY, 1 / 3) *
    Math.pow(diameterM, 0.78) *
    Math.pow(v, 0.44) *
    Math.pow(G, -0.22);
  const craterKm = (1.25 * transient) / 1000;

  return { energyMt, hiroshimas, craterKm, severity: severityFor(energyMt) };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/impact.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/impact.ts src/utils/__tests__/impact.test.ts
git commit -m "feat: add impact simulator physics"
```

---

### Task 2: Best-fit landmark extraction

**Files:**
- Modify: `src/data/diameterComparisons.ts`
- Test: `src/data/__tests__/diameterComparisons.test.ts`

**Interfaces:**
- Produces:
  - `interface Landmark { singular: string; plural: string; meters: number; emoji: string }`
  - `bestFitLandmark(meters: number): { landmark: Landmark; count: number } | null`
  - `describeDiameter(meters: number): string` (unchanged output — now built on `bestFitLandmark`).

- [ ] **Step 1: Read the current file**

Read `src/data/diameterComparisons.ts` to confirm the `COMPARISONS` array and the existing `describeDiameter` selection logic.

- [ ] **Step 2: Write the failing test**

Create `src/data/__tests__/diameterComparisons.test.ts`:
```ts
import { bestFitLandmark, describeDiameter } from '../diameterComparisons';

describe('bestFitLandmark', () => {
  it('returns null for non-positive input', () => {
    expect(bestFitLandmark(0)).toBeNull();
  });
  it('picks a landmark and count for a mid-size object', () => {
    const fit = bestFitLandmark(60); // ~2 double-decker buses / ~2 blue whales
    expect(fit).not.toBeNull();
    expect(fit!.count).toBeGreaterThan(0);
    expect(fit!.landmark.meters).toBeGreaterThan(0);
  });
  it('scales the count with size', () => {
    const small = bestFitLandmark(30);
    const big = bestFitLandmark(900);
    expect(big!.landmark.meters).toBeGreaterThan(small!.landmark.meters);
  });
});

describe('describeDiameter (regression)', () => {
  it('still returns an "About N ..." string with the landmark emoji', () => {
    const s = describeDiameter(30);
    expect(s).toMatch(/^About /);
  });
  it('handles pebble/too-small edges', () => {
    expect(describeDiameter(0)).toContain('pebble');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/data/__tests__/diameterComparisons.test.ts`
Expected: FAIL (`bestFitLandmark` not exported).

- [ ] **Step 4: Refactor `src/data/diameterComparisons.ts`**

Keep the existing `COMPARISONS` array and the two "pebble/gnome" edge strings. Replace the `interface Comparison` name with the exported `Landmark`, add `bestFitLandmark`, and make `describeDiameter` call it. The selection scoring is unchanged (`score = |log(round(count)/4)|`, skip counts `< 0.75`). Full file:
```ts
/**
 * Fun human-scale conversions for an asteroid's estimated diameter.
 */
export interface Landmark {
  singular: string;
  plural: string;
  meters: number;
  emoji: string;
}

const COMPARISONS: Landmark[] = [
  { singular: 'garden gnome', plural: 'garden gnomes', meters: 0.4, emoji: '🗿' },
  { singular: 'human', plural: 'humans', meters: 1.8, emoji: '🧍' },
  { singular: 'double-decker bus', plural: 'double-decker buses', meters: 9, emoji: '🚌' },
  { singular: 'T-Rex', plural: 'T-Rexes', meters: 12, emoji: '🦖' },
  { singular: 'blue whale', plural: 'blue whales', meters: 30, emoji: '🐋' },
  { singular: 'Boeing 747', plural: 'Boeing 747s', meters: 70, emoji: '✈️' },
  { singular: 'Statue of Liberty', plural: 'Statues of Liberty', meters: 93, emoji: '🗽' },
  { singular: 'football pitch', plural: 'football pitches', meters: 105, emoji: '🏟️' },
  { singular: 'Eiffel Tower', plural: 'Eiffel Towers', meters: 330, emoji: '🗼' },
  { singular: 'Empire State Building', plural: 'Empire State Buildings', meters: 443, emoji: '🏙️' },
  { singular: 'Burj Khalifa', plural: 'Burj Khalifas', meters: 828, emoji: '🌆' },
];

/**
 * The best single reference object for a diameter, with how many of it fit.
 * Prefers a comfortable single-digit count (closest to ~4). Null if the object
 * is smaller than the smallest reference.
 */
export function bestFitLandmark(meters: number): { landmark: Landmark; count: number } | null {
  if (!isFinite(meters) || meters <= 0) return null;
  let best: { landmark: Landmark; count: number; score: number } | null = null;
  for (const comp of COMPARISONS) {
    const count = meters / comp.meters;
    if (count < 0.75) continue;
    const rounded = Math.max(1, Math.round(count));
    const score = Math.abs(Math.log(rounded / 4));
    if (!best || score < best.score) best = { landmark: comp, count: rounded, score };
  }
  return best ? { landmark: best.landmark, count: best.count } : null;
}

/** Friendly comparison string, e.g. "About 6 double-decker buses 🚌". */
export function describeDiameter(meters: number): string {
  if (!isFinite(meters) || meters <= 0) return 'Roughly pebble-sized 🪨';
  const fit = bestFitLandmark(meters);
  if (!fit) return 'Smaller than a garden gnome 🗿';
  const { landmark, count } = fit;
  const label = count === 1 ? landmark.singular : landmark.plural;
  const article = count === 1 ? 'About 1' : `About ${count}`;
  return `${article} ${label} ${landmark.emoji}`;
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/data/__tests__/diameterComparisons.test.ts && npx tsc --noEmit`
Expected: PASS (5 tests), tsc clean (existing `describeDiameter` callers unaffected — same signature/output).

- [ ] **Step 6: Commit**

```bash
git add src/data/diameterComparisons.ts src/data/__tests__/diameterComparisons.test.ts
git commit -m "feat: extract bestFitLandmark from diameter comparisons"
```

---

### Task 3: Settings fields (haptics + onboarding)

**Files:**
- Modify: `src/settings/settingsModel.ts`
- Test: `src/settings/__tests__/settingsModel.test.ts` (extend existing)

**Interfaces:**
- Produces: `Settings` gains `hapticsEnabled: boolean` (default `true`) and `onboardingComplete: boolean` (default `false`); `mergeSettings` validates both (non-boolean → default).

- [ ] **Step 1: Read the current file**

Read `src/settings/settingsModel.ts` (note the `Settings` interface, `DEFAULT_SETTINGS`, and `mergeSettings` structure) and `src/settings/__tests__/settingsModel.test.ts`.

- [ ] **Step 2: Add the failing test**

Append to `src/settings/__tests__/settingsModel.test.ts` inside the `describe('mergeSettings', ...)` block:
```ts
  it('defaults the new delight fields', () => {
    const s = mergeSettings({});
    expect(s.hapticsEnabled).toBe(true);
    expect(s.onboardingComplete).toBe(false);
  });
  it('keeps valid booleans and rejects non-booleans', () => {
    expect(mergeSettings({ hapticsEnabled: false, onboardingComplete: true }))
      .toMatchObject({ hapticsEnabled: false, onboardingComplete: true });
    expect(mergeSettings({ hapticsEnabled: 'yes' as unknown }).hapticsEnabled).toBe(true);
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/settings/__tests__/settingsModel.test.ts`
Expected: FAIL (fields undefined).

- [ ] **Step 4: Update `src/settings/settingsModel.ts`**

In the `Settings` interface add:
```ts
  hapticsEnabled: boolean;
  onboardingComplete: boolean;
```
In `DEFAULT_SETTINGS` add:
```ts
  hapticsEnabled: true,
  onboardingComplete: false,
```
In `mergeSettings`, add to the returned object (using a boolean coercion that falls back to the default when the stored value isn't a boolean):
```ts
    hapticsEnabled: typeof s.hapticsEnabled === 'boolean' ? s.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
    onboardingComplete: typeof s.onboardingComplete === 'boolean' ? s.onboardingComplete : DEFAULT_SETTINGS.onboardingComplete,
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/settings/__tests__/settingsModel.test.ts && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/settings/settingsModel.ts src/settings/__tests__/settingsModel.test.ts
git commit -m "feat: add hapticsEnabled and onboardingComplete settings"
```

---

### Task 4: Haptics util

**Files:**
- Create: `src/utils/haptics.ts`
- Modify: `package.json` (expo-haptics)

**Interfaces:**
- Produces: `hapticWarning(enabled: boolean): void`, `hapticSuccess(enabled: boolean): void`.

- [ ] **Step 1: Install expo-haptics**

Run: `npx expo install expo-haptics`

- [ ] **Step 2: Create `src/utils/haptics.ts`**

```ts
import * as Haptics from 'expo-haptics';

/** Warning buzz for hazardous/high-threat moments. No-op when disabled. */
export function hapticWarning(enabled: boolean): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Success buzz for completed actions (reminder set, image shared). */
export function hapticSuccess(enabled: boolean): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/utils/haptics.ts
git commit -m "feat: add gated haptics helpers"
```

---

### Task 5: ScaleVisual component

**Files:**
- Create: `src/components/ScaleVisual.tsx`

**Interfaces:**
- Consumes: `bestFitLandmark`, `formatInt` (`src/utils/units.ts`), `colors`, `react-native-svg`.
- Produces: `ScaleVisual({ diameterM, width }: { diameterM: number; width: number })`.

- [ ] **Step 1: Create `src/components/ScaleVisual.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { bestFitLandmark } from '../data/diameterComparisons';
import { formatInt } from '../utils/units';
import { colors } from '../theme/colors';

/**
 * Draws the asteroid to scale beside its best-fit landmark. The asteroid fills
 * most of the frame; the landmark is scaled by its real-world height ratio, so
 * you see the asteroid dwarf it.
 */
export function ScaleVisual({ diameterM, width }: { diameterM: number; width: number }) {
  const height = 150;
  const fit = bestFitLandmark(diameterM);
  const baseY = height - 22;

  // Asteroid circle sized to ~62% of frame height.
  const astDia = Math.min(width * 0.5, (height - 40));
  const astR = astDia / 2;
  const astCx = width * 0.32;
  const astCy = baseY - astR;

  // Landmark scaled by real height ratio (clamped so it never vanishes).
  const landmarkMeters = fit?.landmark.meters ?? diameterM;
  const lmHpx = Math.max(6, astDia * (landmarkMeters / diameterM));
  const lmW = Math.max(4, lmHpx * 0.25);
  const lmX = width * 0.72;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={baseY} x2={width} y2={baseY} stroke={colors.gridLineFaint} strokeWidth={1} />
        {/* Asteroid */}
        <Circle cx={astCx} cy={astCy} r={astR} fill={colors.spaceSlate} stroke={colors.accentBlue} strokeWidth={2} />
        <SvgText x={astCx} y={astCy + 4} fill={colors.textPrimary} fontSize={12} fontWeight="700" textAnchor="middle">
          {formatInt(diameterM)} m
        </SvgText>
        {/* Landmark silhouette + label */}
        <Rect x={lmX - lmW / 2} y={baseY - lmHpx} width={lmW} height={lmHpx} rx={2} fill={colors.textMuted} />
        <SvgText x={lmX} y={baseY - lmHpx - 6} fill={colors.textMuted} fontSize={16} textAnchor="middle">
          {fit?.landmark.emoji ?? '🗿'}
        </SvgText>
      </Svg>
      <Text className="text-center text-xs" style={{ color: colors.accentBlue }}>
        {fit ? `≈ ${fit.count} ${fit.count === 1 ? fit.landmark.singular : fit.landmark.plural} ${fit.landmark.emoji}` : 'Smaller than a garden gnome 🗿'}
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
git add src/components/ScaleVisual.tsx
git commit -m "feat: add to-scale asteroid/landmark visual"
```

---

### Task 6: ImpactReport card

**Files:**
- Create: `src/components/ImpactReport.tsx`

**Interfaces:**
- Consumes: `Asteroid`, `computeImpact`, `ScaleVisual`, `getThreatLevel`, `useThresholds`, `formatInt`, `colors`.
- Produces: `ImpactReport({ asteroid, width }: { asteroid: Asteroid; width: number })`.

- [ ] **Step 1: Create `src/components/ImpactReport.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { Asteroid } from '../types/neo';
import { computeImpact } from '../utils/impact';
import { ScaleVisual } from './ScaleVisual';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { formatInt } from '../utils/units';
import { colors } from '../theme/colors';

function pretty(n: number): string {
  if (n >= 1000) return formatInt(n);
  if (n >= 1) return n.toPrecision(3);
  return n.toPrecision(2);
}

export function ImpactReport({ asteroid, width }: { asteroid: Asteroid; width: number }) {
  const thresholds = useThresholds();
  const threat = getThreatLevel(asteroid.missLunar, thresholds);
  const { energyMt, hiroshimas, craterKm, severity } = computeImpact(asteroid.diameterAvgM, asteroid.velocityKph);

  return (
    <View style={{ width, backgroundColor: colors.spaceBlack, padding: 16 }}>
      <Text className="text-xs uppercase tracking-widest" style={{ color: colors.threatOrange }}>Impact Report</Text>
      <Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }} numberOfLines={1}>{asteroid.displayName}</Text>

      <View className="mt-3 rounded-2xl p-4" style={{ backgroundColor: colors.spaceSlate }}>
        <Text className="text-lg font-bold" style={{ color: colors.threatOrange }}>💥 {pretty(energyMt)} megatons TNT</Text>
        <Text className="text-sm mt-1" style={{ color: colors.textPrimary }}>≈ {formatInt(hiroshimas)} Hiroshima bombs</Text>
        <Text className="text-sm mt-1" style={{ color: colors.textPrimary }}>Crater ≈ {craterKm >= 1 ? `${craterKm.toFixed(1)} km` : `${formatInt(craterKm * 1000)} m`} wide</Text>
        <Text className="text-sm mt-2 font-semibold" style={{ color: colors.threatYellow }}>{severity}</Text>
      </View>

      <View className="mt-3 rounded-2xl p-2" style={{ backgroundColor: colors.charcoal }}>
        <ScaleVisual diameterM={asteroid.diameterAvgM} width={width - 48} />
      </View>

      <View className="mt-3 rounded-2xl px-4 py-3" style={{ backgroundColor: threat.color }}>
        <Text className="text-center text-sm font-semibold" style={{ color: colors.spaceBlack }}>{threat.verdict}</Text>
      </View>

      <Text className="mt-3 text-center text-[10px] uppercase tracking-widest" style={{ color: colors.textMuted }}>☄️ Armageddon Radar</Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ImpactReport.tsx
git commit -m "feat: add shareable impact report card"
```

---

### Task 7: ImpactReportSheet (capture + share)

**Files:**
- Create: `src/screens/ImpactReportSheet.tsx`
- Modify: `package.json` (react-native-view-shot, expo-sharing)

**Interfaces:**
- Consumes: `ImpactReport`, `Asteroid`, `useSettings`, `hapticSuccess`, `react-native-view-shot` (`captureRef`), `expo-sharing`, `useWindowDimensions`, `colors`.
- Produces: `ImpactReportSheet({ asteroid, visible, onClose }: { asteroid: Asteroid | null; visible: boolean; onClose: () => void })`.

- [ ] **Step 1: Install deps**

Run: `npx expo install react-native-view-shot expo-sharing`

- [ ] **Step 2: Create `src/screens/ImpactReportSheet.tsx`**

```tsx
import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asteroid } from '../types/neo';
import { ImpactReport } from '../components/ImpactReport';
import { colors } from '../theme/colors';
import { useSettings } from '../settings/SettingsContext';
import { hapticSuccess } from '../utils/haptics';

export function ImpactReportSheet({ asteroid, visible, onClose }: { asteroid: Asteroid | null; visible: boolean; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const shotRef = useRef<View>(null);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = Math.min(width - 24, 400);

  const share = async () => {
    setError(null);
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1 });
      if (!(await Sharing.isAvailableAsync())) {
        setError('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri);
      hapticSuccess(settings.hapticsEnabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the image.');
    }
  };

  if (!asteroid) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '92%' }}>
          <View className="flex-row items-center justify-end px-4 pt-3">
            <Pressable onPress={onClose} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 24 }}>
            <View ref={shotRef} collapsable={false} style={{ backgroundColor: colors.spaceBlack, borderRadius: 16, overflow: 'hidden' }}>
              <ImpactReport asteroid={asteroid} width={cardWidth} />
            </View>
            {error && <Text className="mt-2 text-xs" style={{ color: colors.threatOrange }}>{error}</Text>}
            <Pressable onPress={share} className="mt-4 rounded-2xl px-6 py-3 flex-row items-center" style={{ backgroundColor: colors.accentBlue }}>
              <MaterialCommunityIcons name="share-variant" size={18} color={colors.spaceBlack} />
              <Text className="ml-2 font-bold" style={{ color: colors.spaceBlack }}>Share image</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/screens/ImpactReportSheet.tsx
git commit -m "feat: add impact report modal with image capture and share"
```

---

### Task 8: OnboardingCarousel

**Files:**
- Create: `src/components/OnboardingCarousel.tsx`

**Interfaces:**
- Consumes: `colors`, `MaterialCommunityIcons`.
- Produces: `OnboardingCarousel({ onDone }: { onDone: () => void })`.

- [ ] **Step 1: Create `src/components/OnboardingCarousel.tsx`**

```tsx
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SLIDES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string }[] = [
  { icon: 'gauge', title: 'The Threat Gauge', body: "The needle tracks today's closest asteroid in lunar distances — under 1 is red-alert close, over 5 is all clear." },
  { icon: 'radar', title: 'The Live Radar', body: 'Every blip is a near-Earth object today. Tap one to focus it and see its speed, size, and miss distance.' },
  { icon: 'skull-outline', title: 'Impact Reports', body: 'Open any asteroid and hit "Simulate impact" to see energy, craters, and a shareable doomsday card.' },
];

export function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };
  const next = () => (index < SLIDES.length - 1 ? go(index + 1) : onDone());

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.spaceBlack }}>
      <View className="flex-row justify-end px-5 pt-2">
        <Pressable onPress={onDone} hitSlop={10}><Text className="text-sm" style={{ color: colors.textMuted }}>Skip</Text></Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={{ width }} className="items-center justify-center px-8">
            <MaterialCommunityIcons name={s.icon} size={72} color={colors.accentBlue} />
            <Text className="mt-6 text-2xl font-extrabold text-center" style={{ color: colors.textPrimary }}>{s.title}</Text>
            <Text className="mt-3 text-center text-sm" style={{ color: colors.textMuted }}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center justify-between px-8 pb-6">
        <View className="flex-row" style={{ gap: 6 }}>
          {SLIDES.map((_, i) => (
            <View key={i} className="h-2 rounded-full" style={{ width: i === index ? 18 : 8, backgroundColor: i === index ? colors.accentBlue : colors.spaceSlate }} />
          ))}
        </View>
        <Pressable onPress={next} className="rounded-2xl px-6 py-3" style={{ backgroundColor: colors.accentBlue }}>
          <Text className="font-bold" style={{ color: colors.spaceBlack }}>{index < SLIDES.length - 1 ? 'Next' : 'Get started'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingCarousel.tsx
git commit -m "feat: add onboarding carousel"
```

---

### Task 9: Settings — haptics switch + replay intro

**Files:**
- Modify: `src/screens/SettingsSheet.tsx`

**Interfaces:**
- Consumes: `useSettings` (already used in the file), `Switch` (react-native), `onClose` (existing prop).

- [ ] **Step 1: Read the current file**

Read `src/screens/SettingsSheet.tsx` — note the `useSettings()` usage, the `Segmented`/`Slider` sections, and the `onClose` prop.

- [ ] **Step 2: Add the imports**

Ensure `Switch` is imported from `react-native` (merge into the existing import line; do not duplicate).

- [ ] **Step 3: Add the two rows**

After the threat-thresholds section and before the "About" section, insert:
```tsx
            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Feedback</Text>
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>Haptics</Text>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(v) => update({ hapticsEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            <Pressable onPress={() => { update({ onboardingComplete: false }); onClose(); }} className="py-2">
              <Text style={{ color: colors.accentBlue }}>Replay intro</Text>
            </Pressable>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/SettingsSheet.tsx
git commit -m "feat: add haptics toggle and replay-intro to settings"
```

---

### Task 10: App onboarding gate

**Files:**
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `OnboardingCarousel`, `useSettings` (already used in the `Gate` component from Phase 1).

- [ ] **Step 1: Read the current file**

Read `App.tsx` — note the `Gate` component that returns a splash until `hydrated`, then renders `<DashboardScreen />`.

- [ ] **Step 2: Add the import**

```tsx
import { OnboardingCarousel } from './src/components/OnboardingCarousel';
```

- [ ] **Step 3: Extend the `Gate` component**

In `Gate`, replace the final `return <DashboardScreen />;` with an onboarding check that reads settings and updates on completion:
```tsx
  const { hydrated, settings, update } = useSettings();
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.spaceBlack }}>
        <ActivityIndicator color={colors.accentBlue} />
      </View>
    );
  }
  if (!settings.onboardingComplete) {
    return <OnboardingCarousel onDone={() => update({ onboardingComplete: true })} />;
  }
  return <DashboardScreen />;
```
(Adjust the destructure of `useSettings()` at the top of `Gate` to include `settings` and `update`; the `hydrated` branch is unchanged.)

- [ ] **Step 4: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: show onboarding on first launch"
```

---

### Task 11: DetailSheet — simulate button + haptics

**Files:**
- Modify: `src/screens/DetailSheet.tsx`

**Interfaces:**
- Consumes: `ImpactReportSheet`, `useSettings`, `hapticWarning`, `hapticSuccess`, `getThreatLevel`/`useThresholds` (already in file).

- [ ] **Step 1: Read the current file**

Read `src/screens/DetailSheet.tsx` — note the existing `useThresholds`/`useFormatters`/`useNeoDetail` hooks, the `if (!asteroid) return null` guard, the reminder handler (`handleReminder`), and the Share button.

- [ ] **Step 2: Add imports + state**

```tsx
import { ImpactReportSheet } from './ImpactReportSheet';
import { hapticWarning, hapticSuccess } from '../utils/haptics';
import { useSettings } from '../settings/SettingsContext';
```
Inside the component, before the `if (!asteroid) return null` guard, add:
```tsx
  const { settings } = useSettings();
  const [simVisible, setSimVisible] = useState(false);
```
And add an effect (also before the guard) that buzzes when a hazardous asteroid opens:
```tsx
  useEffect(() => {
    if (visible && asteroid?.hazardous) hapticWarning(settings.hapticsEnabled);
  }, [visible, asteroid?.id, asteroid?.hazardous, settings.hapticsEnabled]);
```
(Ensure `useEffect`/`useState` are imported from React.)

- [ ] **Step 3: Success haptic on reminder**

In `handleReminder`, in the `status: 'done'` success branch (after `setReminder({ status: 'done', ... })`), add:
```tsx
      hapticSuccess(settings.hapticsEnabled);
```

- [ ] **Step 4: Add the Simulate button + mount the sheet**

Immediately before the Share `Pressable`, add:
```tsx
            <Pressable
              onPress={() => setSimVisible(true)}
              className="mt-3 rounded-2xl px-4 py-4 flex-row items-center justify-center"
              style={{ backgroundColor: colors.threatOrange }}
            >
              <MaterialCommunityIcons name="bomb" size={20} color={colors.spaceBlack} />
              <Text className="ml-2 text-base font-bold" style={{ color: colors.spaceBlack }}>Simulate impact</Text>
            </Pressable>
```
And just before the component's closing `</Modal>`, mount:
```tsx
      <ImpactReportSheet asteroid={asteroid} visible={simVisible} onClose={() => setSimVisible(false)} />
```

- [ ] **Step 5: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 6: Commit**

```bash
git add src/screens/DetailSheet.tsx
git commit -m "feat: add simulate-impact button and detail haptics"
```

---

### Task 12: Dashboard day-load haptic

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `useSettings`, `hapticWarning`, `useThresholds`, `getThreatLevel`.

- [ ] **Step 1: Read the current file**

Read `src/screens/DashboardScreen.tsx` — note `useNeoWeek`, the `closest` memo, `selectedDateKey` state, and the existing hooks.

- [ ] **Step 2: Add imports**

```tsx
import { useEffect, useRef } from 'react'; // merge into existing react import
import { useSettings } from '../settings/SettingsContext';
import { useThresholds } from '../settings/useFormatters';
import { getThreatLevel } from '../utils/threat';
import { hapticWarning } from '../utils/haptics';
```

- [ ] **Step 3: Add the once-per-day warning effect**

Inside `DashboardScreen`, after `closest` is computed, add:
```tsx
  const { settings } = useSettings();
  const thresholds = useThresholds();
  const buzzedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!closest) return;
    const danger = closest.hazardous || getThreatLevel(closest.missLunar, thresholds).zone === 'danger';
    if (danger && buzzedFor.current !== selectedDateKey) {
      buzzedFor.current = selectedDateKey;
      hapticWarning(settings.hapticsEnabled);
    }
  }, [closest, selectedDateKey, thresholds, settings.hapticsEnabled]);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: buzz on hazardous day-load"
```

---

### Task 13: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites PASS (Phase 1/2 + impact, diameterComparisons, settingsModel additions).

- [ ] **Step 2: Typecheck + production bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 3: On-device smoke test**

Start Metro (`npx expo start`), `adb reverse tcp:8081 tcp:8081`, open in Expo Go, and confirm:
- First launch shows the 3-slide onboarding; Skip/Get-started dismisses it; relaunch does not show it again.
- Opening an asteroid → "Simulate impact" opens the Impact Report (energy, Hiroshimas, crater, severity, to-scale landmark, verdict, watermark); "Share image" opens the OS share sheet with a PNG.
- A hazardous day / opening a hazardous asteroid buzzes; setting a reminder / sharing buzzes; toggling Haptics off in Settings silences them; "Replay intro" shows onboarding again.
- All Phase 1 & 2 features still work.

- [ ] **Step 4: Commit any fixes, then done**

```bash
git add -A && git commit -m "test: Phase 3 verification pass" || echo "nothing to commit"
```

---

## Self-review notes

- **Spec coverage:** Impact Report — physics (Task 1), report card (Task 6), capture/share modal (Task 7), Simulate button (Task 11); scale visual (Tasks 2,5); haptics (Tasks 3,4,11,12); onboarding (Tasks 3,8,9,10); settings additions (Tasks 3,9). All spec sections covered.
- **Verified physics values** (`computeImpact(100,72000)` → 75.09 MT / 5006 Hiroshimas / 2.645 km) are locked from a live computation, and severity buckets are copied verbatim from the spec.
- **Type consistency:** `ImpactResult`, `Landmark`/`bestFitLandmark`, the two new `Settings` fields, and the component prop shapes (`ImpactReport`, `ScaleVisual`, `ImpactReportSheet`, `OnboardingCarousel`) are used identically where produced/consumed.
- **No placeholders:** every code step contains full code; edit-tasks name exact anchors and read the file first.
- **Testing honesty:** pure logic (impact, landmark, settings) is unit-tested; UI/native (SVG, view-shot capture, haptics, onboarding) verified via tsc + bundle + on-device — appropriate for RN.
