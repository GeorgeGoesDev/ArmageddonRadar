# Armageddon Radar — Phase 4b: Android Home-Screen Widget

**Date:** 2026-07-17
**Status:** Approved design → ready for implementation plan
**Scope:** The final roadmap item. The second half of Phase 4 (4a — watchlist +
notifications — is merged). Builds on Phases 1–4a and 3.6, all merged to main.

## Goal

A home-screen widget showing the **next asteroid approaching Earth** — a single
hero card (name, distance, approach time, threat colour) that reads at a glance
and stays truthful without the app running.

## Library choice (decided)

`react-native-android-widget` (v0.21.0, released 2026-07-11): supports the New
Architecture and RN 0.83+, ships an Expo config plugin, and renders widgets from
a React-like Flex/Text/Image tree via a headless JS task. Expo's own
`expo-widgets` (SDK 57) is **iOS-only**, so it cannot serve an Android widget.

**Renderer constraint:** the widget tree supports only `FlexWidget`, `TextWidget`,
`ImageWidget`, `IconWidget`, `OverlapWidget`, `ListWidget`, `SvgWidget`. The card
is built from Flex + Text; the app's `RadarView` (react-native-svg) is **not**
reused.

## Architecture

Mirrors the Phase 4a planner/scheduler split: a *pure* builder + selector, a thin
storage layer, a presentational widget, a headless handler, and an app-side sync.

| Module | Role | Side effects |
|---|---|---|
| `src/widget/snapshot.ts` | `buildWidgetSnapshot`, `selectNextApproach`, types | None — pure, no RN imports |
| `src/widget/storage.ts` | read/write `widget:snapshot:v1` | AsyncStorage only |
| `src/widget/NextApproachWidget.tsx` | presentational widget tree (3 states) | None |
| `src/widget/handler.tsx` | headless task handler: read → select → render | Storage + native draw |
| `src/widget/sync.ts` | app-side `syncWidget`: build → write → repaint | Storage + native, `isExpoGo`-guarded |
| `index.ts` | `registerWidgetTaskHandler(handler)` beside `registerRootComponent` | Registration |

### Data flow

1. **App open →** `useNeoWeek` resolves (network or persisted cache). The existing
   `DashboardScreen` effect that already calls `syncAutoNotifications` also calls
   `syncWidget(week, settings, thresholds)`: it builds the snapshot, writes it to
   AsyncStorage, and calls `requestWidgetUpdate` so the widget repaints immediately
   rather than waiting for an OS tick. **This is why the tap works as "refresh":**
   opening the app *is* the refresh.
2. **OS fires the headless task** — on the 30-minute tick, on `WIDGET_ADDED`, and
   on `WIDGET_RESIZED`. The handler reads the snapshot, calls
   `selectNextApproach(snapshot, Date.now())`, and renders the matching state. It
   never touches the network and never reads settings.

### Freshness model (decided, consistent with 4a)

The snapshot holds the **next ≤10 upcoming approaches**, pre-formatted, and the
*handler* picks the first entry still in the future at render time. So each
30-minute OS tick advances the card to the next object **without the app** — and
when every entry is in the past, the list is exhausted and the widget says so.
Trade-off (accepted, same as 4a notifications): data only refreshes when the app
is opened, and runs dry after ~7 days of non-use. **No background fetch** — MIUI
throttles/kills it, and it would duplicate the app's fetch/normalise layer.

### Headless-context constraints (load-bearing)

- The handler runs in a **bare headless JS context** — no React Navigation, no
  providers, no `global.css`/NativeWind. `handler.tsx` may import only
  `snapshot.ts`, `storage.ts`, `NextApproachWidget.tsx`, and the library's widget
  primitives. Importing anything that transitively reaches `App.tsx` would drag
  NativeWind and the query client into a context that has no business booting them.
- `selectNextApproach` is **total** — it always returns one of three states, never
  throws, so the handler can't leave a blank widget on the home screen.
- `syncWidget` needs the `isExpoGo` guard: `requestWidgetUpdate` calls
  `getWidgetInfo` on the native module, which is a throwing proxy in Expo Go.
  Registering the task handler is safe there (an `AppRegistry` call that never
  fires); the app-side update path is not, so it reuses the existing `isExpoGo`
  guard, wrapped in `try/catch` so a widget failure never breaks the dashboard.

## Snapshot shape (`src/widget/snapshot.ts`, pure)

```ts
export interface WidgetEntry {
  name: string;          // displayName
  distance: string;      // pre-formatted, e.g. "3.4 LD" (user units where wired, else lunar)
  approachEpochMs: number;
  absoluteTime: string;  // pre-formatted local, e.g. "Today 14:20" / "Fri 03:10"
  threatLabel: string;   // e.g. "CAUTION" from getThreatLevel vs user thresholds
  threatColor: string;   // hex from the threat scale
}

export interface WidgetSnapshot {
  entries: WidgetEntry[];   // ascending approachEpochMs, ≤10 future-ish at build time
  builtAtMs: number;
}

export type WidgetState =
  | { kind: 'live'; entry: WidgetEntry }
  | { kind: 'expired' }
  | { kind: 'empty' };

export function buildWidgetSnapshot(
  week: NeoWeek, settings: Settings, thresholds: ThreatThresholds, now: number,
): WidgetSnapshot;

export function selectNextApproach(
  snapshot: WidgetSnapshot | null, now: number,
): WidgetState;
```

- `buildWidgetSnapshot` — flatten the week feed, keep approaches with
  `approachEpochMs >= now`, sort ascending, take the first 10; pre-format
  `distance`, `absoluteTime`, `threatLabel`, `threatColor`. Empty/all-past feed →
  `{ entries: [], builtAtMs: now }`.
- `selectNextApproach` — `null`/unparseable/`entries: []` → `empty`; entries all
  in the past → `expired`; else the first entry with `approachEpochMs >= now` →
  `live`. Pure and total.
- `absoluteTime` is computed at **build** time from the approach epoch. "Today" vs
  a weekday label is resolved relative to `now` at build; acceptable because the
  handler rebuilds nothing and the snapshot is rewritten every app-open. (Absolute
  time chosen over a countdown precisely because it stays correct even if the
  widget goes a long time between redraws under MIUI throttling.)

## Widget visual (`src/widget/NextApproachWidget.tsx`)

Dark-only (the app is `userInterfaceStyle: "dark"`), using `colors` tokens as
plain hex. A ~4×2-cell card built from `FlexWidget` + `TextWidget`:

```
┌────────────────────────────────┐   bg spaceBlack, border cardBorder, radius 16, padding 14
│ ☄  NEXT APPROACH               │   label accentBlue 11sp, letter-spaced
│                                │
│  2016 QA2                      │   name textPrimary 20sp bold
│  3.4 LD  ·  Today 14:20        │   distance + time textMuted 13sp
│  ▂▂▂▂▂▂▂▂▂▂  CAUTION           │   threat bar (FlexWidget bg threatColor) + label threatColor
└────────────────────────────────┘
```

- **live** — the card above, `entry` fields, threat bar/label in `entry.threatColor`.
- **expired** — same frame, muted: header "☄ RADAR", body "Radar data expired",
  sub "Tap to refresh".
- **empty** — same frame, muted: header "☄ RADAR", body "Tap to start tracking".

The whole card carries `clickAction: 'OPEN_APP'` (decided: no deep-linking). Tapping
opens the app to the dashboard, which refreshes the feed and repaints the widget —
so it doubles as the "Tap to refresh" affordance the stale states promise.

## Config (`app.json` plugin)

```jsonc
["react-native-android-widget", {
  "widgets": [{
    "name": "NextApproach",
    "label": "Next Approach",
    "minWidth": "250dp",
    "minHeight": "110dp",
    "targetCellWidth": 4,
    "targetCellHeight": 2,
    "description": "The next asteroid approaching Earth",
    "previewImage": "./assets/widget-preview.png",
    "resizeMode": "horizontal|vertical",
    "updatePeriodMillis": 1800000
  }]
}]
```

- `updatePeriodMillis: 1800000` is the Android 30-minute floor; it is what drives
  the auto-advance to the next approach between app-opens.
- `previewImage` — a generated `assets/widget-preview.png` of the live card, shown
  in the system widget picker.

## New / changed files

```
New:
  src/widget/snapshot.ts             (pure) + src/widget/__tests__/snapshot.test.ts
  src/widget/storage.ts
  src/widget/NextApproachWidget.tsx
  src/widget/handler.tsx
  src/widget/sync.ts
  assets/widget-preview.png
Changed:
  index.ts                           (registerWidgetTaskHandler)
  app.json                           (react-native-android-widget plugin + widget config)
  src/screens/DashboardScreen.tsx    (syncWidget in the existing post-feed effect)
  package.json                       (+ react-native-android-widget)
```

## Testing

Unit tests (`jest-expo`) for the pure logic:
- `buildWidgetSnapshot` — next-≤10 ascending selection; distance/time/threat
  pre-formatting against user thresholds; empty feed → empty; all-past → empty.
- `selectNextApproach` — first future entry → `live`; all-past → `expired`;
  `null`/empty → `empty`; boundary when `approachEpochMs === now` (inclusive → live).

The widget tree, the headless handler, the app-open repaint, and the 30-minute
auto-advance are verified with `tsc --noEmit`, `expo export --platform android`,
and **on-device** (add widget → shows next approach with absolute time; tap opens
app + repaints; stale states after data exhaustion), same as prior phases.

## Build note

`react-native-android-widget` is a native module with an Expo config plugin, so it
needs `npx expo prebuild -p android --clean` (autolinks it, registers the
`AppWidgetProvider` and `RNWidgetBackgroundTask`) → recreate `android/local.properties`
(forward slashes, Write tool) → `gradlew :app:assembleRelease` → install. See
`BUILD.md` and the Phase 3.6 `local.properties`/`JAVA_HOME` notes. (Unlike the
3.6 local module, this is an npm native dependency, so prebuild **is** required.)

## Acceptance criteria

- Adding the widget to the home screen shows the next approaching asteroid: name,
  distance, and the **absolute** approach time ("Today 14:20" / "Fri 03:10"), with
  a threat-coloured bar/label.
- Opening the app refreshes the widget (snapshot rewritten + immediate repaint).
- Between app-opens, the 30-minute tick advances the card to the next approach once
  the shown one has passed, with no app launch and no network.
- When the cached approaches are exhausted, the widget shows "Radar data expired ·
  Tap to refresh"; before any data is cached it shows "Tap to start tracking";
  neither state is a stale/blank card.
- Tapping the widget opens the app to the dashboard.
- In Expo Go the whole widget path is a graceful no-op (no crash).
- All Phase 1–4a + 3.6 features continue to work.

## Out of scope

Deep-linking to a specific asteroid's detail (rejected in favour of whole-widget
OPEN_APP). A countdown timer (absolute time chosen for MIUI-throttle resilience).
Background-fetch refresh (rejected, as in 4a). iOS widgets (`expo-widgets` would be
a separate effort). Multiple widget sizes/variants beyond the single 4×2 card.
Watchlist or multi-object widgets.
