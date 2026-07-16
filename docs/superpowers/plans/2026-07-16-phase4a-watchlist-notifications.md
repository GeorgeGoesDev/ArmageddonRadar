# Armageddon Radar — Phase 4a (Watchlist + Smart Notifications) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted watchlist, a daily-digest notification, and automatic "smart alerts" that fire when an approaching asteroid crosses the user's danger threshold — all client-side, on the existing `expo-notifications` wiring.

**Architecture:** Pure planners (`notificationPlan.ts`) turn the cached 7-day feed + settings into notifications to schedule; a thin side-effecting scheduler (`notificationScheduler.ts`) cancels the previously-scheduled *auto* set and schedules the fresh plan at app-open. A `WatchlistProvider` (mirroring `SettingsProvider`) persists starred ids; a `WatchlistSheet` resolves them, fetching ones outside the current window by id.

**Tech Stack:** React Native 0.86 / Expo SDK 57, TypeScript, NativeWind v4, TanStack Query, `expo-notifications` (already wired), AsyncStorage. Tests: `jest-expo`.

## Global Constraints

- **No new dependencies.** Node ≥ 20.19.4. `npx tsc --noEmit` must pass before EVERY commit (no intermediate red).
- This project uses **NativeWind**: `className` on core RN components (View/Text/Pressable/Switch/Modal/ScrollView) is valid and tsc-clean — not an error.
- `expo-notifications` is **lazy-required** and no-ops in Expo Go (`isExpoGo` from `src/utils/notifications.ts`). All scheduling must stay behind that guard. Never `import 'expo-notifications'` at module top level.
- Notification content contains non-ASCII (🌑 U+1F311, ☄️ U+2604, ★). **Mojibake risk** — after any commit touching `notificationPlan.ts`, verify the emoji are single code points (a byte double-encode passes tsc/tests). The planner tests assert `codePointAt(0)` to guard this.
- Settings defaults (verbatim): `dailyDigestEnabled: true`, `digestHour: 9`, `smartAlertsEnabled: true`. `digestHour` valid range is integer 0–23.
- Watchlist persists to AsyncStorage key `watchlist:v1`; scheduled auto-notification ids persist to `scheduledAuto:v1`. The user's manual telescope reminders are NOT in `scheduledAuto:v1` and must never be cancelled by the scheduler.
- Reuse existing patterns: `SettingsProvider`/`useSettings`, `useThresholds`, `getThreatLevel`, `useNeoDetail`, `hapticSuccess`, the `flexShrink: 1` sheet-scroll fix, and the existing modal idiom.
- Commit after every task. Run `npm test` for tasks adding tests. Run `npx tsc --noEmit` before every commit. Run `npx expo export --platform android --output-dir dist-check` (then `rm -rf dist-check`) for the UI/integration tasks (7, 8) and the final pass.

## File map

**New**
- `src/utils/notificationPlan.ts` (+ `__tests__/notificationPlan.test.ts`) — pure `planDailyDigests`, `planSmartAlerts`.
- `src/utils/notificationScheduler.ts` — side-effecting `syncAutoNotifications`.
- `src/watchlist/WatchlistContext.tsx` (+ `src/watchlist/__tests__/toggleId.test.ts`) — provider, `useWatchlist`, pure `toggleId`.
- `src/screens/WatchlistSheet.tsx` — watchlist screen.

**Modified**
- `src/settings/settingsModel.ts` (+ its test) — 3 new fields + validation.
- `src/screens/SettingsSheet.tsx` — digest + alerts controls.
- `src/components/AsteroidCard.tsx`, `src/screens/DetailSheet.tsx` — star toggle.
- `App.tsx` — mount `WatchlistProvider`.
- `src/screens/DashboardScreen.tsx` — watchlist header icon + `WatchlistSheet` + scheduler effect.

---

### Task 1: Settings — notification fields

**Files:**
- Modify: `src/settings/settingsModel.ts`
- Test: `src/settings/__tests__/settingsModel.test.ts`

**Interfaces:**
- Produces: `Settings` gains `dailyDigestEnabled: boolean`, `digestHour: number`, `smartAlertsEnabled: boolean`. `DEFAULT_SETTINGS` sets `true`/`9`/`true`. `mergeSettings` validates them.

- [ ] **Step 1: Add failing tests**

Append to `src/settings/__tests__/settingsModel.test.ts` (inside the top-level `describe`, or as a new `describe`):
```ts
describe('mergeSettings — notification fields', () => {
  it('defaults the three notification fields', () => {
    const s = mergeSettings(undefined);
    expect(s.dailyDigestEnabled).toBe(true);
    expect(s.digestHour).toBe(9);
    expect(s.smartAlertsEnabled).toBe(true);
  });
  it('respects explicit booleans', () => {
    const s = mergeSettings({ dailyDigestEnabled: false, smartAlertsEnabled: false });
    expect(s.dailyDigestEnabled).toBe(false);
    expect(s.smartAlertsEnabled).toBe(false);
  });
  it('coerces non-boolean notification flags to defaults', () => {
    const s = mergeSettings({ dailyDigestEnabled: 'no', smartAlertsEnabled: 1 });
    expect(s.dailyDigestEnabled).toBe(true);
    expect(s.smartAlertsEnabled).toBe(true);
  });
  it('clamps digestHour to an integer in 0..23, else 9', () => {
    expect(mergeSettings({ digestHour: 0 }).digestHour).toBe(0);
    expect(mergeSettings({ digestHour: 23 }).digestHour).toBe(23);
    expect(mergeSettings({ digestHour: 30 }).digestHour).toBe(9);
    expect(mergeSettings({ digestHour: -1 }).digestHour).toBe(9);
    expect(mergeSettings({ digestHour: 9.5 }).digestHour).toBe(9);
    expect(mergeSettings({ digestHour: 'x' }).digestHour).toBe(9);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/settings/__tests__/settingsModel.test.ts`
Expected: FAIL (fields undefined on the returned object).

- [ ] **Step 3: Implement**

In `src/settings/settingsModel.ts`, add the three fields to the `Settings` interface (after `onboardingComplete`):
```ts
  dailyDigestEnabled: boolean;
  digestHour: number;
  smartAlertsEnabled: boolean;
```
Add to `DEFAULT_SETTINGS` (after `onboardingComplete: false,`):
```ts
  dailyDigestEnabled: true,
  digestHour: 9,
  smartAlertsEnabled: true,
```
Add a helper near `num` (below it):
```ts
function hour(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 23 ? v : fallback;
}
```
Add to the object `mergeSettings` returns (after the `onboardingComplete` line):
```ts
    dailyDigestEnabled: typeof s.dailyDigestEnabled === 'boolean' ? s.dailyDigestEnabled : DEFAULT_SETTINGS.dailyDigestEnabled,
    digestHour: hour(s.digestHour, DEFAULT_SETTINGS.digestHour),
    smartAlertsEnabled: typeof s.smartAlertsEnabled === 'boolean' ? s.smartAlertsEnabled : DEFAULT_SETTINGS.smartAlertsEnabled,
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/settings/__tests__/settingsModel.test.ts && npx tsc --noEmit`
Expected: tests PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/settings/settingsModel.ts src/settings/__tests__/settingsModel.test.ts
git commit -m "feat: add daily-digest and smart-alert settings"
```

---

### Task 2: Notification planners (pure)

**Files:**
- Create: `src/utils/notificationPlan.ts`
- Test: `src/utils/__tests__/notificationPlan.test.ts`

**Interfaces:**
- Consumes: `NeoWeek` (`Record<string, Asteroid[]>` from `src/api/nasa.ts`), `ThreatThresholds` (`{ dangerLD, safeLD }` from `src/utils/threat.ts`).
- Produces:
  - `interface DigestPlan { fireDate: Date; title: string; body: string; dayKey: string }`
  - `interface AlertPlan { fireDate: Date; title: string; body: string; asteroidId: string }`
  - `planDailyDigests(week: NeoWeek, digestHour: number, thresholds: ThreatThresholds, now: number): DigestPlan[]`
  - `planSmartAlerts(week: NeoWeek, dangerLD: number, now: number): AlertPlan[]`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/notificationPlan.test.ts`:
```ts
import { Asteroid } from '../../types/neo';
import { NeoWeek } from '../../api/nasa';
import { planDailyDigests, planSmartAlerts } from '../notificationPlan';

const thresholds = { dangerLD: 1, safeLD: 5 };

function mkAst(p: Partial<Asteroid> & { id: string }): Asteroid {
  return {
    id: p.id,
    name: p.displayName ?? p.id,
    displayName: p.displayName ?? p.id,
    hazardous: p.hazardous ?? false,
    diameterMinM: 10,
    diameterMaxM: 20,
    diameterAvgM: 15,
    velocityKph: 50000,
    missLunar: p.missLunar ?? 3,
    missKm: 1_000_000,
    missMiles: 600_000,
    approachEpochMs: p.approachEpochMs ?? 0,
    approachDateFull: '',
  };
}

describe('planDailyDigests', () => {
  // Days far in the future so digestHour is always ahead of `now`.
  const week: NeoWeek = {
    '2099-01-01': [mkAst({ id: 'b', displayName: 'Bravo', missLunar: 0.5 }), mkAst({ id: 'a', displayName: 'Alpha', missLunar: 2 })],
    '2099-01-02': [mkAst({ id: 'c', displayName: 'Charlie', missLunar: 8 })],
  };
  const now = new Date(2098, 11, 1, 12, 0, 0).getTime();

  it('emits one digest per non-empty day, picking that day’s closest object', () => {
    const plans = planDailyDigests(week, 9, thresholds, now);
    expect(plans.map((p) => p.dayKey)).toEqual(['2099-01-01', '2099-01-02']);
    expect(plans[0].body).toBe('Bravo passes 0.5 LD away — DANGER');
    expect(plans[1].body).toBe('Charlie passes 8.0 LD away — ALL CLEAR');
    // Robust em-dash guard: fromCodePoint is ASCII source, so it yields a real
    // U+2014 at runtime regardless of this file's encoding. If the implementation
    // double-encoded its em-dash literal, the body won't contain a real U+2014
    // and this fails even if the toBe above co-mojibaked to a false pass.
    expect(plans[0].body).toContain(String.fromCodePoint(0x2014));
  });
  it('fires at digestHour local time', () => {
    const p = planDailyDigests(week, 9, thresholds, now)[0];
    expect(p.fireDate.getHours()).toBe(9);
  });
  it('title starts with the 🌑 code point (mojibake guard)', () => {
    const p = planDailyDigests(week, 9, thresholds, now)[0];
    expect(p.title.codePointAt(0)).toBe(0x1f311);
  });
  it('skips a day whose digestHour has already passed', () => {
    const after = new Date(2099, 0, 1, 10, 0, 0).getTime(); // past 09:00 on day 1
    const plans = planDailyDigests(week, 9, thresholds, after);
    expect(plans.map((p) => p.dayKey)).toEqual(['2099-01-02']);
  });
  it('returns [] for an empty feed', () => {
    expect(planDailyDigests({}, 9, thresholds, now)).toEqual([]);
  });
});

describe('planSmartAlerts', () => {
  const now = 1_000_000;
  it('selects future, within-threshold objects and de-dupes by id (earliest approach)', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'a', displayName: 'Alpha', missLunar: 0.5, approachEpochMs: now + 30_000 }), mkAst({ id: 'b', missLunar: 2, approachEpochMs: now + 20_000 })],
      d2: [mkAst({ id: 'a', displayName: 'Alpha', missLunar: 0.7, approachEpochMs: now + 10_000 }), mkAst({ id: 'c', missLunar: 0.8, approachEpochMs: now - 5_000 })],
    };
    const alerts = planSmartAlerts(week, 1, now);
    expect(alerts.map((x) => x.asteroidId)).toEqual(['a']); // b too far, c in the past
    expect(alerts[0].fireDate.getTime()).toBe(now + 10_000); // earliest of a's two approaches
    expect(alerts[0].title.codePointAt(0)).toBe(0x2604); // ☄️ guard
  });
  it('sorts alerts ascending by fireDate', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'x', missLunar: 0.9, approachEpochMs: now + 50_000 }), mkAst({ id: 'y', missLunar: 0.2, approachEpochMs: now + 10_000 })],
    };
    expect(planSmartAlerts(week, 1, now).map((a) => a.asteroidId)).toEqual(['y', 'x']);
  });
  it('returns [] when nothing qualifies', () => {
    const week: NeoWeek = { d1: [mkAst({ id: 'z', missLunar: 9, approachEpochMs: now + 1000 })] };
    expect(planSmartAlerts(week, 1, now)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/__tests__/notificationPlan.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/utils/notificationPlan.ts`**

```ts
import { Asteroid } from '../types/neo';
import { NeoWeek } from '../api/nasa';
import { getThreatLevel, ThreatThresholds } from './threat';

export interface DigestPlan {
  fireDate: Date;
  title: string;
  body: string;
  dayKey: string;
}

export interface AlertPlan {
  fireDate: Date;
  title: string;
  body: string;
  asteroidId: string;
}

/** Local Date at `hour:00` on the given `YYYY-MM-DD` day key. */
function fireDateForDay(dayKey: string, hour: number): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

function threatLabel(missLunar: number, thresholds: ThreatThresholds): string {
  const zone = getThreatLevel(missLunar, thresholds).zone;
  return zone === 'danger' ? 'DANGER' : zone === 'watch' ? 'WATCH' : 'ALL CLEAR';
}

/**
 * One digest per non-empty day, headlining that day's closest object, firing at
 * `digestHour` local. Days whose digest time has already passed (relative to
 * `now`) are skipped so "today" is only scheduled when its hour is still ahead.
 */
export function planDailyDigests(
  week: NeoWeek,
  digestHour: number,
  thresholds: ThreatThresholds,
  now: number,
): DigestPlan[] {
  const plans: DigestPlan[] = [];
  for (const dayKey of Object.keys(week).sort()) {
    const list = week[dayKey];
    if (!list || list.length === 0) continue;
    const closest = list.reduce((a, b) => (a.missLunar <= b.missLunar ? a : b));
    const fireDate = fireDateForDay(dayKey, digestHour);
    if (fireDate.getTime() <= now) continue;
    plans.push({
      fireDate,
      dayKey,
      title: '🌑 Closest approach today',
      body: `${closest.displayName} passes ${closest.missLunar.toFixed(1)} LD away — ${threatLabel(closest.missLunar, thresholds)}`,
    });
  }
  return plans;
}

/**
 * One alert per asteroid whose closest approach is in the future and within
 * `dangerLD`; de-duped by id keeping the earliest qualifying approach, sorted
 * ascending by fire time.
 */
export function planSmartAlerts(week: NeoWeek, dangerLD: number, now: number): AlertPlan[] {
  const byId = new Map<string, Asteroid>();
  for (const list of Object.values(week)) {
    for (const a of list) {
      if (a.approachEpochMs <= now) continue;
      if (a.missLunar > dangerLD) continue;
      const existing = byId.get(a.id);
      if (!existing || a.approachEpochMs < existing.approachEpochMs) byId.set(a.id, a);
    }
  }
  return [...byId.values()]
    .sort((x, y) => x.approachEpochMs - y.approachEpochMs)
    .map((a) => ({
      fireDate: new Date(a.approachEpochMs),
      asteroidId: a.id,
      title: '☄️ Close approach incoming',
      body: `${a.displayName} passes ${a.missLunar.toFixed(1)} LD away at closest approach.`,
    }));
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils/__tests__/notificationPlan.test.ts && npx tsc --noEmit`
Expected: tests PASS (all 8); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/utils/notificationPlan.ts src/utils/__tests__/notificationPlan.test.ts
git commit -m "feat: pure planners for daily digests and smart alerts"
```

---

### Task 3: Notification scheduler (side-effecting)

**Files:**
- Create: `src/utils/notificationScheduler.ts`

**Interfaces:**
- Consumes: `planDailyDigests`, `planSmartAlerts` (Task 2); `isExpoGo` (`src/utils/notifications.ts`); `Settings`; `ThreatThresholds`; `NeoWeek`.
- Produces: `syncAutoNotifications(week: NeoWeek, settings: Settings, thresholds: ThreatThresholds, now?: number): Promise<void>`.

- [ ] **Step 1: Create `src/utils/notificationScheduler.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { NeoWeek } from '../api/nasa';
import { Settings } from '../settings/settingsModel';
import { ThreatThresholds } from './threat';
import { isExpoGo } from './notifications';
import { planDailyDigests, planSmartAlerts } from './notificationPlan';

const SCHEDULED_KEY = 'scheduledAuto:v1';

// Lazy require so the native module never initialises inside Expo Go.
function getNotifications() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

async function ensureAutoChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = getNotifications();
  await N.setNotificationChannelAsync('daily-digest', {
    name: 'Daily Digest',
    importance: N.AndroidImportance.DEFAULT,
    lightColor: '#66FCF1',
  });
  await N.setNotificationChannelAsync('smart-alerts', {
    name: 'Smart Alerts',
    importance: N.AndroidImportance.HIGH,
    lightColor: '#FF4500',
  });
}

/**
 * Reschedules the app's *auto* notifications (daily digests + smart alerts) from
 * the currently cached week feed. No-ops in Expo Go. Cancels only the ids we
 * previously scheduled (tracked in `scheduledAuto:v1`) so the user's manual
 * telescope reminders are never touched.
 */
export async function syncAutoNotifications(
  week: NeoWeek,
  settings: Settings,
  thresholds: ThreatThresholds,
  now: number = Date.now(),
): Promise<void> {
  if (isExpoGo) return;
  const N = getNotifications();

  const perm = await N.getPermissionsAsync();
  if (!perm.granted) {
    const req = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (!req.granted) return;
  }
  await ensureAutoChannels();

  // Cancel the previous auto set.
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_KEY);
    const prior: string[] = raw ? JSON.parse(raw) : [];
    await Promise.all(prior.map((id) => N.cancelScheduledNotificationAsync(id).catch(() => {})));
  } catch {
    /* ignore a corrupt/missing record */
  }

  const digests = settings.dailyDigestEnabled
    ? planDailyDigests(week, settings.digestHour, thresholds, now)
    : [];
  const alerts = settings.smartAlertsEnabled ? planSmartAlerts(week, settings.dangerLD, now) : [];

  const newIds: string[] = [];
  for (const d of digests) {
    const id = await N.scheduleNotificationAsync({
      content: { title: d.title, body: d.body, data: { kind: 'digest', dayKey: d.dayKey } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: d.fireDate, channelId: 'daily-digest' },
    });
    newIds.push(id);
  }
  for (const a of alerts) {
    const id = await N.scheduleNotificationAsync({
      content: { title: a.title, body: a.body, data: { kind: 'alert', asteroidId: a.asteroidId } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: a.fireDate, channelId: 'smart-alerts' },
    });
    newIds.push(id);
  }
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(newIds)).catch(() => {});
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (Cross-check: `scheduleApproachReminder` in `src/utils/notifications.ts` uses the same `SchedulableTriggerInputTypes.DATE` + `channelId` trigger shape, confirming the API.)

- [ ] **Step 3: Commit**

```bash
git add src/utils/notificationScheduler.ts
git commit -m "feat: auto-notification scheduler (cancel + reschedule)"
```

---

### Task 4: SettingsSheet — digest + alert controls

**Files:**
- Modify: `src/screens/SettingsSheet.tsx`

**Interfaces:**
- Consumes: `settings.dailyDigestEnabled`, `settings.digestHour`, `settings.smartAlertsEnabled`, `update` (Task 1).

- [ ] **Step 1: Add the Notifications section**

In `src/screens/SettingsSheet.tsx`, add a new section inside the `ScrollView`, immediately **after** the closing of the "Feedback" block (after the `Replay intro` `Pressable`, before the "NASA API key" heading). Use the exact block below (the hour stepper wraps 0–23 with `(h + 1) % 24` / `(h + 23) % 24`):
```tsx
            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Notifications</Text>
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>Daily digest</Text>
              <Switch
                value={settings.dailyDigestEnabled}
                onValueChange={(v) => update({ dailyDigestEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            {settings.dailyDigestEnabled && (
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-xs" style={{ color: colors.textMuted }}>Digest time</Text>
                <View className="flex-row items-center">
                  <Pressable onPress={() => update({ digestHour: (settings.digestHour + 23) % 24 })} hitSlop={8} className="px-2">
                    <MaterialCommunityIcons name="minus-circle-outline" size={22} color={colors.accentBlue} />
                  </Pressable>
                  <Text className="w-14 text-center text-sm font-semibold" style={{ color: colors.textPrimary }}>
                    {String(settings.digestHour).padStart(2, '0')}:00
                  </Text>
                  <Pressable onPress={() => update({ digestHour: (settings.digestHour + 1) % 24 })} hitSlop={8} className="px-2">
                    <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.accentBlue} />
                  </Pressable>
                </View>
              </View>
            )}
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>Smart alerts</Text>
              <Switch
                value={settings.smartAlertsEnabled}
                onValueChange={(v) => update({ smartAlertsEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            <Text className="text-[11px] mb-1" style={{ color: colors.textMuted }}>
              Auto-notify when an asteroid comes within your danger distance. Needs a real build (not Expo Go).
            </Text>
```
`Switch`, `Pressable`, `Text`, `View`, `MaterialCommunityIcons`, and `colors` are already imported in this file — no new imports.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettingsSheet.tsx
git commit -m "feat: settings controls for digest time and smart alerts"
```

---

### Task 5: Watchlist context + provider

**Files:**
- Create: `src/watchlist/WatchlistContext.tsx`
- Test: `src/watchlist/__tests__/toggleId.test.ts`
- Modify: `App.tsx`

**Interfaces:**
- Produces:
  - `toggleId(ids: string[], id: string): string[]` (pure).
  - `WatchlistProvider` (component) and `useWatchlist(): { ids: string[]; isWatched: (id: string) => boolean; toggle: (id: string) => void }`.

- [ ] **Step 1: Write the failing test**

Create `src/watchlist/__tests__/toggleId.test.ts`:
```ts
import { toggleId } from '../WatchlistContext';

describe('toggleId', () => {
  it('adds an absent id', () => {
    expect(toggleId([], 'a')).toEqual(['a']);
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
  });
  it('removes a present id', () => {
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('is its own inverse applied twice', () => {
    expect(toggleId(toggleId(['a'], 'b'), 'b')).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/watchlist/__tests__/toggleId.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/watchlist/WatchlistContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'watchlist:v1';

/** Pure toggle: add `id` if absent, remove it if present. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

interface WatchlistValue {
  ids: string[];
  isWatched: (id: string) => boolean;
  toggle: (id: string) => void;
}

const WatchlistContext = createContext<WatchlistValue | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setIds(parsed.filter((x): x is string => typeof x === 'string'));
        }
      } catch {
        /* ignore a corrupt record — start empty */
      }
    })();
  }, []);

  const value = useMemo<WatchlistValue>(
    () => ({
      ids,
      isWatched: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((prev) => {
          const next = toggleId(prev, id);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [ids],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- src/watchlist/__tests__/toggleId.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Mount the provider in `App.tsx`**

Add the import (near the `SettingsProvider` import):
```tsx
import { WatchlistProvider } from './src/watchlist/WatchlistContext';
```
Wrap `<SafeAreaProvider>` with `<WatchlistProvider>` inside `<SettingsProvider>`:
```tsx
      <SettingsProvider>
        <WatchlistProvider>
          <SafeAreaProvider>
            <Gate />
          </SafeAreaProvider>
        </WatchlistProvider>
      </SettingsProvider>
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.
```bash
git add src/watchlist/WatchlistContext.tsx src/watchlist/__tests__/toggleId.test.ts App.tsx
git commit -m "feat: watchlist provider with persisted starred ids"
```

---

### Task 6: Star toggle on card + detail

**Files:**
- Modify: `src/components/AsteroidCard.tsx`, `src/screens/DetailSheet.tsx`

**Interfaces:**
- Consumes: `useWatchlist` (Task 5), `hapticSuccess`, `useSettings`.

- [ ] **Step 1: AsteroidCard — add a star that does not open details**

In `src/components/AsteroidCard.tsx`, add imports:
```tsx
import { useWatchlist } from '../watchlist/WatchlistContext';
import { useSettings } from '../settings/SettingsContext';
import { hapticSuccess } from '../utils/haptics';
```
Inside the component (after `const fmt = useFormatters();`):
```tsx
  const { isWatched, toggle } = useWatchlist();
  const { settings } = useSettings();
  const watched = isWatched(asteroid.id);
  const onStar = () => {
    if (!watched) hapticSuccess(settings.hapticsEnabled);
    toggle(asteroid.id);
  };
```
Replace the right-hand `Pressable` (the one with `onPress={onDetails}` containing the HAZARDOUS badge + chevron) so the star sits OUTSIDE the details-opening Pressable:
```tsx
        <View className="flex-row items-center">
          <Pressable onPress={onStar} hitSlop={10} className="mr-2">
            <MaterialCommunityIcons name={watched ? 'star' : 'star-outline'} size={20} color={watched ? colors.threatYellow : colors.textMuted} />
          </Pressable>
          <Pressable onPress={onDetails} hitSlop={10} className="flex-row items-center">
            {asteroid.hazardous && (
              <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: 'rgba(255,69,0,0.15)' }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.threatOrange }}>HAZARDOUS</Text>
              </View>
            )}
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accentBlue} />
          </Pressable>
        </View>
```

- [ ] **Step 2: DetailSheet — add a star next to the close button**

In `src/screens/DetailSheet.tsx`, add imports:
```tsx
import { useWatchlist } from '../watchlist/WatchlistContext';
```
(`hapticSuccess` and `useSettings` are already imported.) Inside the component (after `const { settings } = useSettings();`):
```tsx
  const { isWatched, toggle } = useWatchlist();
```
In the header, replace the close `Pressable` block with a star + close pair:
```tsx
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => {
                    if (!isWatched(asteroid.id)) hapticSuccess(settings.hapticsEnabled);
                    toggle(asteroid.id);
                  }}
                  hitSlop={12}
                  className="mr-3"
                >
                  <MaterialCommunityIcons
                    name={isWatched(asteroid.id) ? 'star' : 'star-outline'}
                    size={26}
                    color={isWatched(asteroid.id) ? colors.threatYellow : colors.textMuted}
                  />
                </Pressable>
                <Pressable onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close-circle" size={28} color={colors.textMuted} />
                </Pressable>
              </View>
```
(This replaces the single `<Pressable onPress={onClose} …>` currently in the header row. `asteroid` is guaranteed non-null here — the early `if (!asteroid) return null;` runs above.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/AsteroidCard.tsx src/screens/DetailSheet.tsx
git commit -m "feat: star/unstar asteroids from card and detail"
```

---

### Task 7: Watchlist screen + dashboard entry

**Files:**
- Create: `src/screens/WatchlistSheet.tsx`
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `useWatchlist`, `useNeoDetail`, `NeoWeek`, `Asteroid`, `AsteroidCard`.
- Produces: `WatchlistSheet({ visible, week, onClose, onOpen })`.

- [ ] **Step 1: Create `src/screens/WatchlistSheet.tsx`**

```tsx
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Asteroid } from '../types/neo';
import { NeoWeek } from '../api/nasa';
import { useWatchlist } from '../watchlist/WatchlistContext';
import { useNeoDetail } from '../hooks/useNeoDetail';
import { AsteroidCard } from '../components/AsteroidCard';

function cleanName(name: string): string {
  return name.replace(/^\(|\)$/g, '').trim();
}

/** A row for a starred object that is NOT in the current 7-day feed. */
function RemoteRow({ id }: { id: string }) {
  const { data, isLoading } = useNeoDetail(id);
  const { toggle } = useWatchlist();
  const name = data ? cleanName(data.name) : id;
  const next = data
    ? data.approaches
        .filter((a) => a.orbitingBody === 'Earth' && a.epochMs > Date.now())
        .sort((a, b) => a.epochMs - b.epochMs)[0]
    : undefined;
  const subtitle = isLoading
    ? 'Loading…'
    : next
      ? `Next approach ${new Date(next.epochMs).toLocaleDateString([], { day: '2-digit', month: 'short' })} · ${next.missLunar.toFixed(1)} LD`
      : 'Not currently approaching';

  return (
    <View className="rounded-2xl p-4 mb-3 flex-row items-center justify-between" style={{ backgroundColor: colors.spaceSlate, borderWidth: 1.5, borderColor: colors.cardBorder }}>
      <View className="flex-1 mr-2">
        <Text className="text-base font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>{name}</Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>
      </View>
      <Pressable onPress={() => toggle(id)} hitSlop={10}>
        <MaterialCommunityIcons name="star" size={22} color={colors.threatYellow} />
      </Pressable>
    </View>
  );
}

export function WatchlistSheet({
  visible,
  week,
  onClose,
  onOpen,
}: {
  visible: boolean;
  week: NeoWeek | undefined;
  onClose: () => void;
  onOpen: (a: Asteroid) => void;
}) {
  const { ids } = useWatchlist();
  const byId = useMemo(() => {
    const m = new Map<string, Asteroid>();
    if (week) for (const list of Object.values(week)) for (const a of list) if (!m.has(a.id)) m.set(a.id, a);
    return m;
  }, [week]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>★ Watchlist</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView className="px-5" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            {ids.length === 0 ? (
              <View className="py-16 items-center">
                <MaterialCommunityIcons name="star-outline" size={48} color={colors.textMuted} />
                <Text className="mt-3 text-center text-sm" style={{ color: colors.textMuted }}>No starred asteroids yet.</Text>
                <Text className="mt-1 text-center text-xs" style={{ color: colors.textMuted }}>Tap the ★ on any asteroid to track it here.</Text>
              </View>
            ) : (
              ids.map((id) => {
                const inFeed = byId.get(id);
                return inFeed ? (
                  <AsteroidCard key={id} asteroid={inFeed} selected={false} onPress={() => onOpen(inFeed)} onDetails={() => onOpen(inFeed)} />
                ) : (
                  <RemoteRow key={id} id={id} />
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Wire the dashboard header icon**

In `src/screens/DashboardScreen.tsx`:

(a) Add the import (near the other screen imports):
```tsx
import { WatchlistSheet } from './WatchlistSheet';
```
(b) Change the `Header` component signature and add a star button. Replace the whole `Header` function's props type and its action row so it accepts `onWatchlist`:
```tsx
function Header({ onWatchlist, onWeek, onSettings, onRisk }: { onWatchlist: () => void; onWeek: () => void; onSettings: () => void; onRisk: () => void }) {
```
and add this `Pressable` immediately before the `onRisk` skull `Pressable`:
```tsx
        <Pressable onPress={onWatchlist} hitSlop={8} className="ml-2"><MaterialCommunityIcons name="star" size={22} color={colors.threatYellow} /></Pressable>
```
(c) Add state near the other `useState` flags:
```tsx
  const [watchlistVisible, setWatchlistVisible] = useState(false);
```
(d) Pass the prop where `<Header .../>` is rendered:
```tsx
      <Header onWatchlist={() => setWatchlistVisible(true)} onWeek={() => setWeekVisible(true)} onSettings={() => setSettingsVisible(true)} onRisk={() => setRiskVisible(true)} />
```
(e) Render the sheet next to the other sheets (after `<SettingsSheet .../>`):
```tsx
      <WatchlistSheet visible={watchlistVisible} week={week} onClose={() => setWatchlistVisible(false)} onOpen={(a) => { setWatchlistVisible(false); openDetails(a); }} />
```

- [ ] **Step 3: Typecheck + bundle**

Run: `npx tsc --noEmit && npx expo export --platform android --output-dir dist-check`
Expected: both succeed. Then `rm -rf dist-check`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/WatchlistSheet.tsx src/screens/DashboardScreen.tsx
git commit -m "feat: watchlist screen resolving in- and out-of-window objects"
```

---

### Task 8: Wire the scheduler + full verification

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `syncAutoNotifications` (Task 3).

- [ ] **Step 1: Trigger the scheduler on feed load + settings change**

In `src/screens/DashboardScreen.tsx`, add the import:
```tsx
import { syncAutoNotifications } from '../utils/notificationScheduler';
```
Add an effect after the existing hazardous-buzz `useEffect` (it uses `week`, `settings`, `thresholds`, all already in scope):
```tsx
  useEffect(() => {
    if (!week) return;
    syncAutoNotifications(week, settings, thresholds).catch(() => {});
  }, [week, settings.dailyDigestEnabled, settings.digestHour, settings.smartAlertsEnabled, thresholds.dangerLD, thresholds.safeLD]);
```

- [ ] **Step 2: Typecheck + full test suite + bundle**

Run: `npx tsc --noEmit && npm test && npx expo export --platform android --output-dir dist-check`
Expected: tsc clean; ALL suites pass (incl. `settingsModel`, `notificationPlan`, `toggleId`); bundle succeeds. Then `rm -rf dist-check`.

- [ ] **Step 3: Mojibake scan**

Confirm the notification emoji are single code points (not double-encoded). Read `src/utils/notificationPlan.ts` and verify: the digest title begins with 🌑 (U+1F311) and the alert title begins with ☄️ (U+2604), and there are no `Ã`/`â€` sequences. (The Task 2 tests already assert `codePointAt(0)` — a green suite is the guard; this is a visual double-check.)

- [ ] **Step 4: On-device smoke test**

Build/run on a real device (not Expo Go): `npx expo run:android` (or install the release APK), then confirm:
- Starring an asteroid (card ★ and detail ★) persists across an app restart; the header ★ opens the Watchlist screen listing starred objects; a starred object outside the 7-day window shows a "Next approach …" or "Not currently approaching" row; empty state shows when nothing is starred.
- Settings shows Daily digest (with a working hour stepper) and Smart alerts switches.
- With notifications permitted, a digest and/or alert schedules without error (observable via the OS notification settings or by setting `digestHour` to the next hour); the manual telescope reminder still works and is unaffected.
- All Phase 1–3.5 features still work.

- [ ] **Step 5: Commit any fixes, then done**

```bash
git add -A && git commit -m "test: Phase 4a verification pass" || echo "nothing to commit"
```

---

## Self-review notes

- **Spec coverage:** watchlist provider+persistence (Task 5), star UI (Task 6), watchlist screen incl. out-of-window resolution + empty state (Task 7); settings fields (Task 1) + UI (Task 4); pure digest planner (Task 2) + scheduler (Task 3) + trigger (Task 8); smart-alert planner (Task 2) + scheduler (Task 3). All spec sections covered.
- **tsc-green every commit:** each task adds new files or additive fields/UI; no task removes a symbol another unchanged file depends on. Task 1 adds required `Settings` fields but `DEFAULT_SETTINGS` (the only full `Settings` literal) is updated in the same task, and all other construction goes through `mergeSettings`/`update(partial)`.
- **Type consistency:** `DigestPlan`/`AlertPlan`, `planDailyDigests(week, digestHour, thresholds, now)`, `planSmartAlerts(week, dangerLD, now)`, `syncAutoNotifications(week, settings, thresholds, now?)`, `useWatchlist(): { ids, isWatched, toggle }`, and `toggleId(ids, id)` are used identically where produced/consumed. `NeoWeek = Record<string, Asteroid[]>`; each day is pre-sorted ascending by `missLunar`, but the planners recompute the min defensively.
- **No placeholders:** every code step has complete code; edit steps name exact files and anchor points.
- **Testing honesty:** pure logic (settings validation, both planners, watchlist toggle) is unit-tested; the side-effecting scheduler, star UI, watchlist screen, and settings controls are verified via `tsc` + `expo export` + on-device (they wrap native modules that no-op in Expo Go / jest).
- **Mojibake:** notification strings carry emoji; Task 2 tests assert `codePointAt(0)` and Task 8 adds an explicit scan.
