# Phase 4b (Android Home-Screen Widget) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A home-screen widget showing the next asteroid approaching Earth — a hero card (name, distance, absolute approach time, threat colour) driven by a cached snapshot, with honest stale/empty states.

**Architecture:** A pure builder/selector (`snapshot.ts`) turns the cached week feed into a small list and picks the next still-future entry; a thin storage layer persists it; a headless task handler renders a Flex/Text widget tree; an app-side `syncWidget` (same trigger as `syncAutoNotifications`) writes the snapshot and repaints on app-open. Mirrors the Phase 4a pure-planner + thin-side-effect split.

**Tech Stack:** Expo SDK 57, React Native 0.86 (New Architecture), TypeScript, `react-native-android-widget` (native module + Expo config plugin), AsyncStorage, jest-expo.

**Spec:** `docs/superpowers/specs/2026-07-17-phase4b-android-widget-design.md`

## Global Constraints

- **Branch:** work on `phase-4b-widget` (already created; the spec is committed there).
- **Expo docs:** per `AGENTS.md`, consult `https://docs.expo.dev/versions/v57.0.0/` and the library docs (`https://saleksovski.github.io/react-native-android-widget/`) before writing against them.
- **Library:** `react-native-android-widget` — install with `npx expo install`. It is a **native module with a config plugin**, so it requires `expo prebuild` (Task 6), unlike a local module.
- **Renderer subset only:** widgets support `FlexWidget`, `TextWidget`, `ImageWidget`, `IconWidget`, `OverlapWidget`, `ListWidget`, `SvgWidget`. Do **not** reuse `RadarView`/react-native-svg. The card is Flex + Text.
- **Headless handler isolation:** `handler.tsx` may import ONLY `./snapshot`, `./storage`, `./NextApproachWidget`, and `react-native-android-widget`. Never import anything that transitively reaches `App.tsx` (no providers, NativeWind, `global.css`, query client).
- **`selectNextApproach` is total** — always returns a `WidgetState`, never throws.
- **`syncWidget` is `isExpoGo`-guarded** (`getWidgetInfo` throws in Expo Go) and wrapped in `try/catch` so a widget failure never breaks the dashboard.
- **`snapshot.ts` is pure** — no runtime RN imports; use `import type` for `NeoWeek`, `Asteroid`, `ThreatThresholds`.
- **No `Intl`** for time formatting (unreliable on Hermes) — build the weekday from a fixed array and zero-pad `HH:MM` manually.
- **Storage key:** `widget:snapshot:v1`. **`updatePeriodMillis`:** `1800000` (Android 30-min floor; drives the auto-advance).
- **Widget name:** `NextApproach`. **Dark-only**, using `src/theme/colors.ts` tokens as hex.
- **No background fetch** (MIUI throttles it; would duplicate the fetch layer).
- **Tests:** `npx jest <path>`, jest-expo, tests in `__tests__/` beside the code.
- **Do not** run `expo prebuild` until Task 6 (it wipes `android/local.properties`).

---

### Task 1: `snapshot.ts` — pure builder + selector

**Files:**
- Create: `src/widget/snapshot.ts`
- Test: `src/widget/__tests__/snapshot.test.ts`

**Interfaces:**
- Consumes: `NeoWeek` (`Record<string, Asteroid[]>`) from `src/api/nasa.ts`; `Asteroid` (has `displayName: string`, `missLunar: number`, `approachEpochMs: number`) from `src/types/neo.ts`; `ThreatThresholds` (`{ dangerLD: number; safeLD: number }`) and `getThreatLevel(lunar, thresholds) => { zone: 'danger'|'watch'|'safe'; color: string }` from `src/utils/threat.ts`.
- Produces: `WidgetEntry`, `WidgetSnapshot`, `WidgetState`, `buildWidgetSnapshot(week, thresholds, now)`, `selectNextApproach(snapshot, now)`, `formatApproachTime(epochMs, now)`.

**Note on signature:** the builder takes `(week, thresholds, now)` — not `settings`. Distance is formatted in lunar distances ("X.X LD"), so `settings` is unused (YAGNI; a small, intentional narrowing of the spec's 4-arg sketch).

- [ ] **Step 1: Write the failing test**

Create `src/widget/__tests__/snapshot.test.ts`:

```ts
import {
  buildWidgetSnapshot,
  selectNextApproach,
  formatApproachTime,
  WidgetSnapshot,
} from '../snapshot';
import type { NeoWeek } from '../../api/nasa';
import type { Asteroid } from '../../types/neo';

const thresholds = { dangerLD: 1, safeLD: 5 };

function ast(id: string, missLunar: number, approachEpochMs: number): Asteroid {
  return {
    id, name: id, displayName: id, hazardous: false,
    diameterMinM: 10, diameterMaxM: 20, diameterAvgM: 15,
    velocityKph: 1000, missLunar, missKm: missLunar * 384400, missMiles: 0,
    approachEpochMs, approachDateFull: '',
  };
}

// 2026-07-17T12:00:00 local as the reference "now".
const NOW = new Date(2026, 6, 17, 12, 0, 0).getTime();
const HOUR = 3600_000;

describe('buildWidgetSnapshot', () => {
  it('keeps future approaches, sorts ascending, caps at 10', () => {
    const week: NeoWeek = {
      '2026-07-17': [
        ast('past', 2, NOW - HOUR),
        ast('soon', 3.4, NOW + 2 * HOUR),
        ast('later', 8, NOW + 5 * HOUR),
      ],
    };
    const snap = buildWidgetSnapshot(week, thresholds, NOW);
    expect(snap.entries.map((e) => e.name)).toEqual(['soon', 'later']);
    expect(snap.entries[0].distance).toBe('3.4 LD');
    expect(snap.entries[0].threatLabel).toBe('CAUTION'); // 1 <= 3.4 <= 5 -> watch
    expect(snap.entries.length).toBeLessThanOrEqual(10);
  });

  it('returns an empty snapshot for an all-past / empty feed', () => {
    expect(buildWidgetSnapshot({ '2026-07-17': [ast('p', 2, NOW - HOUR)] }, thresholds, NOW).entries).toEqual([]);
    expect(buildWidgetSnapshot({}, thresholds, NOW).entries).toEqual([]);
  });

  it('labels a sub-danger object HAZARDOUS', () => {
    const snap = buildWidgetSnapshot({ '2026-07-17': [ast('close', 0.5, NOW + HOUR)] }, thresholds, NOW);
    expect(snap.entries[0].threatLabel).toBe('HAZARDOUS');
  });
});

describe('selectNextApproach', () => {
  const snap: WidgetSnapshot = {
    entries: [
      { name: 'a', distance: '2.0 LD', approachEpochMs: NOW + HOUR, absoluteTime: 'Today 13:00', threatLabel: 'CAUTION', threatColor: '#FAD02C' },
    ],
    builtAtMs: NOW,
  };

  it('returns the first future entry as live', () => {
    const s = selectNextApproach(snap, NOW);
    expect(s.kind).toBe('live');
    expect(s.kind === 'live' && s.entry.name).toBe('a');
  });

  it('is expired when every entry is in the past', () => {
    expect(selectNextApproach(snap, NOW + 2 * HOUR).kind).toBe('expired');
  });

  it('is empty for null or no entries', () => {
    expect(selectNextApproach(null, NOW).kind).toBe('empty');
    expect(selectNextApproach({ entries: [], builtAtMs: NOW }, NOW).kind).toBe('empty');
  });

  it('treats an approach exactly at now as live (inclusive)', () => {
    expect(selectNextApproach(snap, NOW + HOUR).kind).toBe('live');
  });
});

describe('formatApproachTime', () => {
  it('uses Today for the same local day', () => {
    expect(formatApproachTime(new Date(2026, 6, 17, 14, 20).getTime(), NOW)).toBe('Today 14:20');
  });
  it('uses a weekday for another day and zero-pads', () => {
    // 2026-07-18 is a Saturday.
    expect(formatApproachTime(new Date(2026, 6, 18, 3, 5).getTime(), NOW)).toBe('Sat 03:05');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/widget/__tests__/snapshot.test.ts`
Expected: FAIL — cannot find module `../snapshot`.

- [ ] **Step 3: Write minimal implementation**

Create `src/widget/snapshot.ts`:

```ts
import type { NeoWeek } from '../api/nasa';
import type { Asteroid } from '../types/neo';
import { getThreatLevel, ThreatThresholds } from '../utils/threat';

export interface WidgetEntry {
  name: string;
  distance: string;
  approachEpochMs: number;
  absoluteTime: string;
  threatLabel: string;
  threatColor: string;
}

export interface WidgetSnapshot {
  entries: WidgetEntry[];
  builtAtMs: number;
}

export type WidgetState =
  | { kind: 'live'; entry: WidgetEntry }
  | { kind: 'expired' }
  | { kind: 'empty' };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_ENTRIES = 10;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Local "Today HH:MM" for same-day, else "Wkd HH:MM". No Intl (Hermes-safe). */
export function formatApproachTime(epochMs: number, now: number): string {
  const d = new Date(epochMs);
  const n = new Date(now);
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
  return sameDay ? `Today ${time}` : `${WEEKDAYS[d.getDay()]} ${time}`;
}

function threatLabelFor(zone: 'danger' | 'watch' | 'safe'): string {
  return zone === 'danger' ? 'HAZARDOUS' : zone === 'watch' ? 'CAUTION' : 'SAFE';
}

/** Next up-to-10 future approaches, ascending, pre-formatted for the widget. */
export function buildWidgetSnapshot(
  week: NeoWeek,
  thresholds: ThreatThresholds,
  now: number,
): WidgetSnapshot {
  const all: Asteroid[] = ([] as Asteroid[]).concat(...Object.values(week));
  const entries = all
    .filter((a) => a.approachEpochMs >= now)
    .sort((a, b) => a.approachEpochMs - b.approachEpochMs)
    .slice(0, MAX_ENTRIES)
    .map((a): WidgetEntry => {
      const threat = getThreatLevel(a.missLunar, thresholds);
      return {
        name: a.displayName,
        distance: `${a.missLunar.toFixed(1)} LD`,
        approachEpochMs: a.approachEpochMs,
        absoluteTime: formatApproachTime(a.approachEpochMs, now),
        threatLabel: threatLabelFor(threat.zone),
        threatColor: threat.color,
      };
    });
  return { entries, builtAtMs: now };
}

/** Total: always returns a state, never throws. */
export function selectNextApproach(snapshot: WidgetSnapshot | null, now: number): WidgetState {
  if (!snapshot || snapshot.entries.length === 0) return { kind: 'empty' };
  const next = snapshot.entries.find((e) => e.approachEpochMs >= now);
  return next ? { kind: 'live', entry: next } : { kind: 'expired' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/widget/__tests__/snapshot.test.ts`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add src/widget/snapshot.ts src/widget/__tests__/snapshot.test.ts
git commit -m "feat: pure widget snapshot builder and next-approach selector"
```

---

### Task 2: Install the library, add config + storage

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.json` (add the `react-native-android-widget` plugin)
- Create: `src/widget/storage.ts`

**Interfaces:**
- Consumes: `WidgetSnapshot` (Task 1).
- Produces: `readWidgetSnapshot(): Promise<WidgetSnapshot | null>`, `writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void>`, `WIDGET_SNAPSHOT_KEY`.

- [ ] **Step 1: Install the library**

```bash
npx expo install react-native-android-widget
```

Expected: added to `package.json` at its SDK-57-compatible version. Do **not** run `expo prebuild` yet.

- [ ] **Step 2: Add the config plugin to `app.json`**

In `app.json`, add to the `plugins` array (alongside the existing entries):

```json
[
  "react-native-android-widget",
  {
    "widgets": [
      {
        "name": "NextApproach",
        "label": "Next Approach",
        "minWidth": "250dp",
        "minHeight": "110dp",
        "targetCellWidth": 4,
        "targetCellHeight": 2,
        "description": "The next asteroid approaching Earth",
        "resizeMode": "horizontal|vertical",
        "updatePeriodMillis": 1800000
      }
    ]
  }
]
```

(`previewImage` is added in Task 6 once the asset exists — it is optional in the plugin's widget config.)

- [ ] **Step 3: Write `storage.ts`**

Create `src/widget/storage.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetSnapshot } from './snapshot';

export const WIDGET_SNAPSHOT_KEY = 'widget:snapshot:v1';

/** Reads the persisted snapshot, or null if missing/unreadable/unparseable. */
export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

/** Persists the snapshot; swallows write errors (the widget is non-critical). */
export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* non-fatal */
  }
}
```

- [ ] **Step 4: Typecheck and verify the bundle resolves the new dep**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx expo export --platform android`
Expected: export completes without module-resolution errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json src/widget/storage.ts
git commit -m "feat: add react-native-android-widget config and snapshot storage"
```

---

### Task 3: `NextApproachWidget` — the widget tree

**Files:**
- Create: `src/widget/NextApproachWidget.tsx`

**Interfaces:**
- Consumes: `WidgetState` (Task 1); `FlexWidget`, `TextWidget` from `react-native-android-widget`; `colors` from `src/theme/colors.ts`.
- Produces: `NextApproachWidget({ state }: { state: WidgetState }): JSX.Element`.

- [ ] **Step 1: Write the component**

Create `src/widget/NextApproachWidget.tsx`:

```tsx
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { colors } from '../theme/colors';
import { WidgetState } from './snapshot';

// The whole card opens the app (which refreshes the feed and repaints the
// widget) — this doubles as the "Tap to refresh" action the stale states name.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: colors.spaceBlack,
        borderRadius: 16,
        padding: 14,
      }}
    >
      {children}
    </FlexWidget>
  );
}

function Header({ text }: { text: string }) {
  return (
    <TextWidget
      text={text}
      style={{ fontSize: 11, color: colors.accentBlue, letterSpacing: 1.5 }}
    />
  );
}

export function NextApproachWidget({ state }: { state: WidgetState }) {
  if (state.kind === 'empty') {
    return (
      <Frame>
        <Header text="☄ RADAR" />
        <TextWidget text="Tap to start tracking" style={{ fontSize: 15, color: colors.textMuted }} />
        <TextWidget text=" " style={{ fontSize: 11, color: colors.textMuted }} />
      </Frame>
    );
  }
  if (state.kind === 'expired') {
    return (
      <Frame>
        <Header text="☄ RADAR" />
        <TextWidget text="Radar data expired" style={{ fontSize: 15, color: colors.textMuted }} />
        <TextWidget text="Tap to refresh" style={{ fontSize: 11, color: colors.textMuted }} />
      </Frame>
    );
  }

  const { entry } = state;
  return (
    <Frame>
      <Header text="☄ NEXT APPROACH" />
      <TextWidget text={entry.name} style={{ fontSize: 20, color: colors.textPrimary, fontWeight: '700' }} />
      <TextWidget
        text={`${entry.distance}  ·  ${entry.absoluteTime}`}
        style={{ fontSize: 13, color: colors.textMuted }}
      />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ height: 6, width: 120, borderRadius: 3, backgroundColor: entry.threatColor }} />
        <TextWidget
          text={`  ${entry.threatLabel}`}
          style={{ fontSize: 12, color: entry.threatColor, fontWeight: '700' }}
        />
      </FlexWidget>
    </Frame>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If a `style` prop is rejected, consult the library docs for the exact `FlexWidget`/`TextWidget` style keys and adjust — the renderer supports a subset of RN styles.

- [ ] **Step 3: Scan for mojibake**

Run: `LC_ALL=C.UTF-8 grep -nP "[^\x00-\x7F]" src/widget/NextApproachWidget.tsx`
Expected: only the intended `☄` (U+2604) and `·` (U+00B7) appear, once each per use — no doubled/garbled sequences (e.g. `â˜„`). If anything looks doubled, retype the character.

- [ ] **Step 4: Commit**

```bash
git add src/widget/NextApproachWidget.tsx
git commit -m "feat: NextApproach widget tree with live/expired/empty states"
```

---

### Task 4: Headless task handler + registration

**Files:**
- Create: `src/widget/handler.tsx`
- Modify: `index.ts`

**Interfaces:**
- Consumes: `readWidgetSnapshot` (Task 2); `selectNextApproach` (Task 1); `NextApproachWidget` (Task 3); `WidgetTaskHandlerProps` from `react-native-android-widget`.
- Produces: `widgetTaskHandler(props): Promise<void>`.

- [ ] **Step 1: Write the handler**

Create `src/widget/handler.tsx`. Import ONLY the four allowed sources (no App-tree imports):

```tsx
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readWidgetSnapshot } from './storage';
import { selectNextApproach } from './snapshot';
import { NextApproachWidget } from './NextApproachWidget';

const WIDGET_NAME = 'NextApproach';

// Runs in a bare headless JS context (no providers, NativeWind, or query client).
// Reads the cached snapshot and renders — never fetches, never reads settings.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const snapshot = await readWidgetSnapshot();
  const state = selectNextApproach(snapshot, Date.now());
  props.renderWidget(<NextApproachWidget state={state} />);
}
```

- [ ] **Step 2: Register the handler in `index.ts`**

The current `index.ts` is:

```ts
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

Change it to:

```ts
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widget/handler';

registerRootComponent(App);
// Registers the headless task that draws the widget. Safe in Expo Go — it is an
// AppRegistry registration that only fires under a real widget host.
registerWidgetTaskHandler(widgetTaskHandler);
```

- [ ] **Step 3: Typecheck and run the suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: all green (85 existing + Task 1's new tests).

- [ ] **Step 4: Commit**

```bash
git add src/widget/handler.tsx index.ts
git commit -m "feat: headless widget task handler + registration"
```

---

### Task 5: `syncWidget` + wire into the dashboard

**Files:**
- Create: `src/widget/sync.ts`
- Modify: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `buildWidgetSnapshot` (Task 1); `writeWidgetSnapshot` (Task 2); `requestWidgetUpdate`, `NextApproachWidget` from earlier; `isExpoGo` from `src/utils/notifications.ts`; `selectNextApproach`; `NeoWeek`; `ThreatThresholds`.
- Produces: `syncWidget(week, thresholds, now?): Promise<void>`.

- [ ] **Step 1: Write `sync.ts`**

Create `src/widget/sync.ts`:

```tsx
import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { NeoWeek } from '../api/nasa';
import type { ThreatThresholds } from '../utils/threat';
import { isExpoGo } from '../utils/notifications';
import { buildWidgetSnapshot, selectNextApproach } from './snapshot';
import { writeWidgetSnapshot } from './storage';
import { NextApproachWidget } from './NextApproachWidget';

const WIDGET_NAME = 'NextApproach';

/**
 * Rebuilds the widget snapshot from the cached week feed and repaints any live
 * widget immediately. No-ops in Expo Go (the native module throws there), and
 * never lets a widget failure break the caller.
 */
export async function syncWidget(
  week: NeoWeek,
  thresholds: ThreatThresholds,
  now: number = Date.now(),
): Promise<void> {
  if (isExpoGo) return;
  try {
    const snapshot = buildWidgetSnapshot(week, thresholds, now);
    await writeWidgetSnapshot(snapshot);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <NextApproachWidget state={selectNextApproach(snapshot, Date.now())} />,
      widgetNotFound: () => {},
    });
  } catch {
    /* widget is non-critical — never surface to the dashboard */
  }
}
```

- [ ] **Step 2: Call it from the dashboard's post-feed effect**

In `src/screens/DashboardScreen.tsx`, find the effect that calls `syncAutoNotifications` (around line 107-110):

```ts
  useEffect(() => {
    if (!week) return;
    syncAutoNotifications(week, settings, thresholds).catch(() => {});
  }, [week, settings.dailyDigestEnabled, settings.digestHour, settings.smartAlertsEnabled, thresholds.dangerLD, thresholds.safeLD]);
```

Add the `syncWidget` import at the top:

```ts
import { syncWidget } from '../widget/sync';
```

And call it inside that same effect body, right after `syncAutoNotifications`:

```ts
  useEffect(() => {
    if (!week) return;
    syncAutoNotifications(week, settings, thresholds).catch(() => {});
    syncWidget(week, thresholds).catch(() => {});
  }, [week, settings.dailyDigestEnabled, settings.digestHour, settings.smartAlertsEnabled, thresholds.dangerLD, thresholds.safeLD]);
```

(The effect already depends on `week` and the threshold primitives, which is exactly what `syncWidget` reads — no dependency-array change needed.)

- [ ] **Step 3: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx jest`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/widget/sync.ts src/screens/DashboardScreen.tsx
git commit -m "feat: sync widget snapshot + repaint on feed load"
```

---

### Task 6: Preview asset, prebuild, build, on-device verify

**Files:**
- Create: `assets/widget-preview.png`
- Modify: `app.json` (add `previewImage` to the widget config)

Native module + config plugin means autolinking must register the `AppWidgetProvider` and the `RNWidgetBackgroundTask` — a JS reload cannot do that. Full procedure in `BUILD.md`.

- [ ] **Step 1: Add a preview image**

Create `assets/widget-preview.png` — a simple dark preview of the card (a representative image is sufficient; it only appears in the system widget picker). Then add `"previewImage": "./assets/widget-preview.png"` to the `NextApproach` widget object in `app.json`.

If no suitable image can be produced, leave `previewImage` out — it is optional and the picker falls back to a default.

- [ ] **Step 2: Prebuild**

```bash
npx expo prebuild -p android --clean
```

This **wipes `android/local.properties`**. If it fails with `EBUSY`/locked, stop any Gradle daemon first: `./android/gradlew --stop`, then retry.

- [ ] **Step 3: Recreate `local.properties`**

Use the Write tool (not `printf`/`echo`) to create `android/local.properties` with **forward slashes**:

```
sdk.dir=C:/Users/gkout/AppData/Local/Android/Sdk
```

Backslashes are invalid Java `.properties` escapes → `SdkLocator … syntax is incorrect`.

- [ ] **Step 4: Build the release APK**

```bash
JAVA_HOME="C:/Program Files/Microsoft/jdk-17.0.19.10-hotspot" ./android/gradlew -p android :app:assembleRelease
```

Expected: `BUILD SUCCESSFUL`. The MS OpenJDK 17 is not on `PATH` by default.

- [ ] **Step 5: Install**

Locate the APK (prior builds have landed at either `android/app/build/outputs/apk/release/app-release.apk` or `app/build/outputs/apk/release/app-release.apk` — use the freshest):

```bash
find . -name app-release.apk -newermt '-10 minutes' 2>/dev/null
~/AppData/Local/Android/Sdk/platform-tools/adb.exe install -r <path>
```

If the device shows `offline`/`INSTALL_FAILED_USER_RESTRICTED`: `adb reconnect offline`, ensure MIUI "Install via USB" is on, retry, and confirm `lastUpdateTime`.

- [ ] **Step 6: Verify against the acceptance criteria (report observed behaviour)**

1. Long-press the home screen → Widgets → add **Next Approach**.
2. It shows the next approaching asteroid: name, distance, absolute time ("Today 14:20" / "Fri 03:10"), threat-coloured bar/label.
3. Tapping the widget opens the app to the dashboard.
4. After opening the app, the widget repaints (snapshot rewritten).
5. Before any data is cached (fresh install, widget added first) it reads "Tap to start tracking"; when cached approaches are exhausted it reads "Radar data expired · Tap to refresh" — never a blank card.
6. Existing Phase 1–4a + 3.6 features still work.

(The 30-minute auto-advance can't be observed on demand; confirm the mechanism by noting the shown object is always the next *future* one after an app-open.)

- [ ] **Step 7: Commit any tracked changes**

```bash
git add assets/widget-preview.png app.json
git commit -m "feat: widget preview image"
git status --short
```

`android/` is generated by prebuild — commit only if the repo already tracks it (`git ls-files android | head`); it does not, so commit nothing else here.

---

## Done criteria

- `npx jest` green; `npx tsc --noEmit` clean.
- Every acceptance criterion in the spec verified on-device and reported with observed behaviour.
- Then use `superpowers:finishing-a-development-branch` to open the PR for `phase-4b-widget`.
- This is the **last roadmap item** — Phase 4b completes the planned build.
