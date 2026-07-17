# Phase 5 (Localization: English + Greek) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize all app-authored copy into English + Greek with `expo-localization` + `i18n-js`, auto-detecting the device language with a persisted Settings override, localized number formatting, and removal of the Expo-Go hint copy.

**Architecture:** A shared `i18n-js` instance with `en`/`el` catalogs; a `LocaleProvider` (mirroring `SettingsContext`) holds/persists the active locale and exposes `useTranslation() → { t, locale, setLocale }`. Non-React surfaces (widget snapshot, notification planners) are localized at build time app-side by receiving `t`. A key-parity test guards the stringly-typed catalogs.

**Tech Stack:** Expo SDK 57, RN 0.86 (New Arch), TypeScript, `expo-localization`, `i18n-js` v4, jest-expo.

**Spec:** `docs/superpowers/specs/2026-07-17-phase5-localization-design.md`

## Global Constraints

- **Branch:** `phase-5-localization` (already created; spec committed there).
- **Deps:** install with `npx expo install expo-localization` and `npx expo install i18n-js` (or `npm i i18n-js` if expo-install rejects it — it's pure JS). `expo-localization` is native + config plugin → **prebuild required** (Task 10).
- **i18n-js v4 API:** `new I18n({ en, el }, { defaultLocale: 'en', enableFallback: true })`; `i18n.locale = 'el'`; `i18n.t('a.b', { name })` with `%{name}` interpolation and `{ count }` pluralization. Consult `/fnando/i18n` docs if unsure.
- **`enableFallback: true`** — a missing `el` key must render the English string, never a raw key.
- **Locale values:** exactly `'en' | 'el'`. Persisted under AsyncStorage key **`locale:v1`**. Locale lives in `LocaleContext`, **NOT** in `Settings`/`mergeSettings`.
- **Number formatting:** pure `formatNumber` swapping separators by locale (`en` → `1,234.5`, `el` → `1.234,5`) — do **NOT** rely on `Intl('el-GR')` ICU data.
- **No `Intl` for dates** (Hermes) — keyed relative-date words + the existing weekday array.
- **NASA data is never keyed** — asteroid names, APOD title/explanation, approach text pass through as-is.
- **Every `el` string is drafted by the implementer, flagged for the user's review** (the user is a native Greek speaker) — keep Greek idiomatic, match the English tone (esp. the jokey threat verdicts), never literal-translate a joke.
- **Tests:** `npx jest <path>`, jest-expo, tests in `__tests__/` beside code.
- **Do not** run `expo prebuild` until Task 10.

---

### Task 1: i18n foundation (instance, context, format, detection)

**Files:**
- Modify: `package.json` (via install)
- Create: `src/i18n/en.ts`, `src/i18n/el.ts`, `src/i18n/i18n.ts`, `src/i18n/format.ts`, `src/i18n/LocaleContext.tsx`
- Create tests: `src/i18n/__tests__/format.test.ts`, `src/i18n/__tests__/catalogs.test.ts`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `en`, `el` (catalog objects); `i18n` (I18n instance); `Locale = 'en' | 'el'`; `formatNumber(value: number, locale: Locale, fractionDigits?: number): string`; `detectDeviceLocale(): Locale`; `LocaleProvider`; `useTranslation(): { t: TFunc; locale: Locale; setLocale(l: Locale): void }` where `TFunc = (key: string, params?: Record<string, unknown>) => string`.

- [ ] **Step 1: Install dependencies**

```bash
npx expo install expo-localization
npx expo install i18n-js || npm i i18n-js
```

Do **not** run `expo prebuild` yet.

- [ ] **Step 2: Write failing tests**

Create `src/i18n/__tests__/format.test.ts`:

```ts
import { formatNumber } from '../format';

describe('formatNumber', () => {
  it('English: dot decimal, comma thousands', () => {
    expect(formatNumber(1234.5, 'en', 1)).toBe('1,234.5');
    expect(formatNumber(384400, 'en', 0)).toBe('384,400');
    expect(formatNumber(3.4, 'en', 1)).toBe('3.4');
  });
  it('Greek: comma decimal, dot thousands', () => {
    expect(formatNumber(1234.5, 'el', 1)).toBe('1.234,5');
    expect(formatNumber(384400, 'el', 0)).toBe('384.400');
    expect(formatNumber(3.4, 'el', 1)).toBe('3,4');
  });
  it('handles negatives and zero fraction', () => {
    expect(formatNumber(-1234, 'el', 0)).toBe('-1.234');
    expect(formatNumber(5, 'en', 0)).toBe('5');
  });
});
```

Create `src/i18n/__tests__/catalogs.test.ts`:

```ts
import { en } from '../en';
import { el } from '../el';

function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? keyPaths(v as Record<string, unknown>, path) : [path];
  });
}

describe('translation catalogs', () => {
  it('en and el have identical key sets', () => {
    const enKeys = keyPaths(en).sort();
    const elKeys = keyPaths(el).sort();
    expect(elKeys).toEqual(enKeys);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/i18n/__tests__`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create the catalogs (seed)**

Create `src/i18n/en.ts` — seed with the keys this task needs; later tasks add sections:

```ts
export const en = {
  common: { close: 'Close', cancel: 'Cancel', retry: 'Retry' },
  settings: { language: 'Language' },
};

export type Catalog = typeof en;
```

Create `src/i18n/el.ts` — same keys, Greek values (draft; user reviews):

```ts
import type { Catalog } from './en';

export const el: Catalog = {
  common: { close: 'Κλείσιμο', cancel: 'Άκυρο', retry: 'Επανάληψη' },
  settings: { language: 'Γλώσσα' },
};
```

Note: typing `el` as `Catalog` gives partial compile-time help, but nested shape drift can still slip through — the parity test is the real guard.

- [ ] **Step 5: Create the i18n instance**

Create `src/i18n/i18n.ts`:

```ts
import { I18n } from 'i18n-js';
import { en } from './en';
import { el } from './el';

export type Locale = 'en' | 'el';

export const i18n = new I18n(
  { en, el },
  { defaultLocale: 'en', enableFallback: true },
);
```

- [ ] **Step 6: Create format + detection**

Create `src/i18n/format.ts`:

```ts
import { getLocales } from 'expo-localization';
import type { Locale } from './i18n';

/**
 * Formats a number with locale-specific separators, without relying on Intl's
 * per-locale ICU data (not guaranteed on Hermes for el-GR). en: 1,234.5 ·
 * el: 1.234,5.
 */
export function formatNumber(value: number, locale: Locale, fractionDigits = 0): string {
  const neg = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [intPart, fracPart] = fixed.split('.');
  const groupSep = locale === 'el' ? '.' : ',';
  const decimalSep = locale === 'el' ? ',' : '.';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
  const body = fracPart ? `${grouped}${decimalSep}${fracPart}` : grouped;
  return neg ? `-${body}` : body;
}

/** Device language on first launch: Greek device → 'el', else 'en'. */
export function detectDeviceLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode === 'el' ? 'el' : 'en';
  } catch {
    return 'en';
  }
}
```

- [ ] **Step 7: Create the LocaleProvider**

Create `src/i18n/LocaleContext.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, Locale } from './i18n';
import { detectDeviceLocale } from './format';

const STORAGE_KEY = 'locale:v1';

export type TFunc = (key: string, params?: Record<string, unknown>) => string;

interface LocaleContextValue {
  t: TFunc;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const detected = detectDeviceLocale();
    i18n.locale = detected;
    return detected;
  });

  // Hydrate a persisted override (async); falls back to the detected default.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'el') {
          i18n.locale = saved;
          setLocaleState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    i18n.locale = l;
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback<TFunc>((key, params) => i18n.t(key, params), [locale]);

  const value = useMemo<LocaleContextValue>(() => ({ t, locale, setLocale }), [t, locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useTranslation must be used within LocaleProvider');
  return ctx;
}
```

- [ ] **Step 8: Mount the provider in `App.tsx`**

Wrap the existing provider tree. In `App.tsx`, add the import and wrap `<SettingsProvider>…</SettingsProvider>` (the outermost app-state provider) with `<LocaleProvider>`:

```tsx
import { LocaleProvider } from './src/i18n/LocaleContext';
```

```tsx
      <SettingsProvider>
        <WatchlistProvider>
          <LocaleProvider>
            <SafeAreaProvider>
              <Gate />
            </SafeAreaProvider>
          </LocaleProvider>
        </WatchlistProvider>
      </SettingsProvider>
```

(Placing `LocaleProvider` just outside `SafeAreaProvider`/`Gate` is enough — all screens are under `Gate`.)

- [ ] **Step 9: Run tests + typecheck**

Run: `npx jest src/i18n/__tests__ && npx tsc --noEmit`
Expected: format (3) + parity (1) pass; tsc clean.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json app.json src/i18n App.tsx
git commit -m "feat: i18n foundation — i18n-js instance, LocaleProvider, formatNumber, device detection"
```

---

### Task 2: Locale-aware number formatting in units

**Files:**
- Modify: `src/utils/units.ts`
- Modify: `src/settings/useFormatters.ts`
- Test: `src/utils/__tests__/units.test.ts` (exists — extend)

**Interfaces:**
- Consumes: `formatNumber`, `Locale` (Task 1).
- Produces: `makeFormatters(prefs, locale)` — same `Formatters` shape, locale-aware numbers. `formatInt(n, locale)`, `formatDiameterRange(minM, maxM, locale)`.

- [ ] **Step 1: Extend the test**

Add to `src/utils/__tests__/units.test.ts`:

```ts
import { makeFormatters } from '../units';

describe('makeFormatters locale', () => {
  it('formats distance in Greek separators', () => {
    const f = makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }, 'el');
    expect(f.distanceFromLunar(3.4, 0, 0)).toBe('3,4 LD');
  });
  it('formats km thousands in Greek', () => {
    const f = makeFormatters({ distanceUnit: 'km', velocityUnit: 'kph' }, 'el');
    expect(f.distanceFromLunar(0, 384400, 0)).toBe('384.400 km');
  });
  it('English unchanged', () => {
    const f = makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }, 'en');
    expect(f.distanceFromLunar(3.4, 0, 0)).toBe('3.4 LD');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/utils/__tests__/units.test.ts`
Expected: FAIL — `makeFormatters` takes 1 arg / wrong numbers.

- [ ] **Step 3: Rewrite `units.ts` number output**

Replace the `Intl.NumberFormat` constants and the three formatter helpers so all numeric output goes through `formatNumber`, and thread `locale`:

```ts
import { formatNumber } from '../i18n/format';
import type { Locale } from '../i18n/i18n';

export const KM_TO_MILES = 0.621371;

export function formatInt(n: number, locale: Locale): string {
  return formatNumber(n, locale, 0);
}

export function formatDiameterRange(minM: number, maxM: number, locale: Locale): string {
  return `${formatNumber(minM, locale, 0)} – ${formatNumber(maxM, locale, 0)} m`;
}

export type DistanceUnit = 'lunar' | 'km' | 'miles';
export type VelocityUnit = 'kph' | 'mph';

export interface UnitPrefs { distanceUnit: DistanceUnit; velocityUnit: VelocityUnit; }
export interface Formatters {
  distanceFromLunar(lunar: number, kmValue: number, milesValue: number): string;
  velocity(kph: number): string;
  diameterRange(minM: number, maxM: number): string;
  int(n: number): string;
}

export function makeFormatters(prefs: UnitPrefs, locale: Locale): Formatters {
  return {
    distanceFromLunar(lunar, kmValue, milesValue) {
      switch (prefs.distanceUnit) {
        case 'km': return `${formatNumber(kmValue, locale, 0)} km`;
        case 'miles': return `${formatNumber(milesValue, locale, 0)} mi`;
        case 'lunar':
        default: return `${formatNumber(lunar, locale, 1)} LD`;
      }
    },
    velocity(kph) {
      return prefs.velocityUnit === 'mph'
        ? `${formatNumber(kph * KM_TO_MILES, locale, 0)} mph`
        : `${formatNumber(kph, locale, 0)} km/h`;
    },
    diameterRange(minM, maxM) { return formatDiameterRange(minM, maxM, locale); },
    int(n) { return formatNumber(n, locale, 0); },
  };
}
```

- [ ] **Step 4: Thread locale through `useFormatters`**

Rewrite `src/settings/useFormatters.ts` so `useFormatters` reads the locale:

```ts
import { useMemo } from 'react';
import { useSettings } from './SettingsContext';
import { useTranslation } from '../i18n/LocaleContext';
import { Formatters, makeFormatters } from '../utils/units';
import { ThreatThresholds } from '../utils/threat';

export function useFormatters(): Formatters {
  const { settings } = useSettings();
  const { locale } = useTranslation();
  return useMemo(
    () => makeFormatters({ distanceUnit: settings.distanceUnit, velocityUnit: settings.velocityUnit }, locale),
    [settings.distanceUnit, settings.velocityUnit, locale],
  );
}

export function useThresholds(): ThreatThresholds {
  const { settings } = useSettings();
  return useMemo(() => ({ dangerLD: settings.dangerLD, safeLD: settings.safeLD }), [settings.dangerLD, settings.safeLD]);
}
```

- [ ] **Step 5: Fix the other `formatInt`/`formatDiameterRange` call sites**

Run: `grep -rn "formatInt\|formatDiameterRange" src --include=*.tsx --include=*.ts | grep -v units.ts`
For each call site, pass the locale (from `useTranslation()` in components). Update each to `formatInt(n, locale)` / `formatDiameterRange(min, max, locale)`.

- [ ] **Step 6: Typecheck + test**

Run: `npx tsc --noEmit && npx jest`
Expected: clean; all green (tsc surfaces any missed call site).

- [ ] **Step 7: Commit**

```bash
git add src/utils/units.ts src/settings/useFormatters.ts src/**/*.tsx
git commit -m "feat: locale-aware number formatting"
```

---

### Task 3: Threat verdicts → catalog + helpers

**Files:**
- Modify: `src/utils/threat.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/el.ts`
- Modify consumers: `src/components/ImpactReport.tsx`, `src/components/VerdictBanner.tsx`
- Test: `src/utils/__tests__/threat.test.ts` (exists — adjust)

**Interfaces:**
- Consumes: `TFunc` (Task 1).
- Produces: `threatVerdict(t, zone): string`, `threatShortVerdict(t, zone): string`; `getThreatLevel` returns `{ t, zone, color }` (no `verdict`/`shortVerdict`).

- [ ] **Step 1: Add catalog keys**

Add a `threat` section to `en.ts` (and mirror in `el.ts`, drafting Greek that keeps the humor — flag for user review):

```ts
// en.ts
  threat: {
    hazardVerdict: '🚨 Lock your doors. (Just kidding, but it’s close!)',
    watchVerdict: '👀 Keep your eyes on the skies.',
    safeVerdict: '🛡️ Verdict: Not today, space rocks.',
    hazardShort: 'Lock your doors (just kidding… mostly)',
    watchShort: 'Keep your eyes on the skies',
    safeShort: 'Not today, space rocks',
  },
```

```ts
// el.ts — DRAFT, user reviews the humor
  threat: {
    hazardVerdict: '🚨 Κλείδωσε τις πόρτες. (Πλάκα κάνω, αλλά είναι κοντά!)',
    watchVerdict: '👀 Μάτια στον ουρανό.',
    safeVerdict: '🛡️ Ετυμηγορία: Όχι σήμερα, πετρόβραχοι.',
    hazardShort: 'Κλείδωσε τις πόρτες (πλάκα κάνω… σχεδόν)',
    watchShort: 'Μάτια στον ουρανό',
    safeShort: 'Όχι σήμερα, πετρόβραχοι',
  },
```

- [ ] **Step 2: Update `threat.ts`**

Remove `verdict`/`shortVerdict` from `ThreatLevel` and from the three returns of `getThreatLevel`; add the helpers. Import `TFunc`:

```ts
import { colors } from '../theme/colors';
import type { TFunc } from '../i18n/LocaleContext';

export type ThreatZone = 'danger' | 'watch' | 'safe';
export interface ThreatThresholds { dangerLD: number; safeLD: number; }
export const DEFAULT_THRESHOLDS: ThreatThresholds = { dangerLD: 1, safeLD: 5 };

export interface ThreatLevel { t: number; zone: ThreatZone; color: string; }

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

export function getThreatLevel(lunar: number, thresholds: ThreatThresholds = DEFAULT_THRESHOLDS): ThreatLevel {
  const { dangerLD, safeLD } = thresholds;
  const t = clamp01((safeLD - lunar) / safeLD);
  if (lunar < dangerLD) return { t, zone: 'danger', color: colors.threatOrange };
  if (lunar <= safeLD) return { t, zone: 'watch', color: colors.threatYellow };
  return { t, zone: 'safe', color: colors.safeGreen };
}

const VERDICT: Record<ThreatZone, string> = { danger: 'threat.hazardVerdict', watch: 'threat.watchVerdict', safe: 'threat.safeVerdict' };
const SHORT: Record<ThreatZone, string> = { danger: 'threat.hazardShort', watch: 'threat.watchShort', safe: 'threat.safeShort' };

export function threatVerdict(t: TFunc, zone: ThreatZone): string { return t(VERDICT[zone]); }
export function threatShortVerdict(t: TFunc, zone: ThreatZone): string { return t(SHORT[zone]); }
```

- [ ] **Step 3: Update the test**

In `src/utils/__tests__/threat.test.ts`, drop assertions on `.verdict`/`.shortVerdict` (they no longer exist); keep `zone`/`color`/`t` assertions. Add:

```ts
import { threatVerdict } from '../threat';
it('threatVerdict maps zone to the catalog key via t', () => {
  const fakeT = (k: string) => k;
  expect(threatVerdict(fakeT, 'danger')).toBe('threat.hazardVerdict');
});
```

- [ ] **Step 4: Update consumers**

`ImpactReport.tsx:39` uses `threat.verdict` → `threatVerdict(t, threat.zone)` (get `t` from `useTranslation()`). `VerdictBanner.tsx` similarly. Run `grep -rn "\.verdict\|\.shortVerdict" src` and fix every remaining reader.

- [ ] **Step 5: Typecheck + test**

Run: `npx tsc --noEmit && npx jest`
Expected: clean; green (tsc flags any missed `.verdict` reader; parity test confirms el has the keys).

- [ ] **Step 6: Commit**

```bash
git add src/utils/threat.ts src/i18n src/components/ImpactReport.tsx src/components/VerdictBanner.tsx src/utils/__tests__/threat.test.ts
git commit -m "feat: localize threat verdicts via catalog helpers"
```

---

## Extraction tasks (4–8): the shared pattern

Tasks 4–8 are mechanical string extraction. **Every extraction task follows this exact pattern** — read it once:

**The rule:** in each listed file, every **app-authored** user-facing string literal (JSX text, `title`/`label`/`placeholder` props, `Alert` text, hardcoded messages) moves into the catalog under the task's section, and the literal is replaced with `t('section.key')`. Interpolated strings use `%{param}`. **Do not** key: NASA data (names, APOD text), unit symbols (`km`, `LD`), icon names, `console`/dev logs, or `accessibilityLabel`s that duplicate visible text (key those too if user-visible).

**Worked example** (the template for all extraction):

```tsx
// BEFORE — src/components/AsteroidCard.tsx
<Text>Hazardous</Text>
<Text>{`${count} approaching today`}</Text>

// AFTER
const { t } = useTranslation();          // add near top of component
<Text>{t('card.hazardous')}</Text>
<Text>{t('card.approachingToday', { count })}</Text>
```

```ts
// en.ts  (add section)
  card: { hazardous: 'Hazardous', approachingToday: '%{count} approaching today' },
// el.ts  (mirror, DRAFT Greek — flag for user review)
  card: { hazardous: 'Επικίνδυνος', approachingToday: '%{count} πλησιάζουν σήμερα' },
```

**Per-task verification (identical for 4–8):**
1. `npx tsc --noEmit` — clean.
2. `npx jest src/i18n/__tests__/catalogs.test.ts` — key parity holds (proves `el` mirrors every new `en` key).
3. **Leftover-literal grep** on the task's files:
   `grep -nE ">[A-Z][a-z]+ |\"[A-Z][a-z]+ [a-z]|title=\"|placeholder=\"" <files>` — inspect each hit; every app-authored one must now be a `t(...)` call (NASA-data passthroughs and unit symbols are allowed to remain).
4. `LC_ALL=C.UTF-8 grep -nP "[^\x00-\x7F]" src/i18n/el.ts` — Greek is present and not mojibake (Greek letters are expected; check for no doubled/garbled `Ã`-style sequences).
5. Commit.

**Greek note for 4–8:** draft idiomatic Greek for every new `el` key; keep jokey/marketing tone equivalent, not literal. These are flagged for the user's review at Task 10.

---

### Task 4: Settings sheet + Language picker + hint removal

**Files:** `src/screens/SettingsSheet.tsx`, `src/i18n/en.ts`, `src/i18n/el.ts`
**Catalog section:** `settings`

Follow the shared extraction pattern, plus:

- [ ] **Step 1** — Extract all SettingsSheet copy into `settings.*` (titles, row labels, captions, unit-toggle labels, button text, the API-key section, etc.).
- [ ] **Step 2** — Add the **Language** control using the existing `Segmented<T>` component in this file:

```tsx
const { t, locale, setLocale } = useTranslation();
// …in the settings list, a new row:
<Text style={{ color: colors.textPrimary }}>{t('settings.language')}</Text>
<Segmented
  options={[{ key: 'en', label: 'English' }, { key: 'el', label: 'Ελληνικά' }]}
  value={locale}
  onChange={setLocale}
/>
```

- [ ] **Step 3 — REMOVE the Expo-Go hint** at `SettingsSheet.tsx:125` (the "…Needs a real build (not Expo Go)." sentence). Keep the rest of that caption; just drop that clause. Do **not** add it to the catalog.
- [ ] **Step 4** — Run the shared verification (tsc, parity, leftover grep on SettingsSheet, mojibake) + confirm via `grep -n "Expo Go\|real build" src/screens/SettingsSheet.tsx` that the hint is gone.
- [ ] **Step 5** — Commit: `feat: localize settings + add language picker, remove expo-go hint`

---

### Task 5: Onboarding

**Files:** `src/components/OnboardingCarousel.tsx`, `src/i18n/en.ts`, `src/i18n/el.ts`
**Catalog section:** `onboarding`

Follow the shared extraction pattern. Extract every slide's title/body/button copy into `onboarding.*`. Commit: `feat: localize onboarding`.

---

### Task 6: Dashboard + list/control components

**Files:** `src/screens/DashboardScreen.tsx`, `src/components/AsteroidCard.tsx`, `src/components/DaySelector.tsx`, `src/components/ListControlsBar.tsx`, `src/components/FilterSheet.tsx`, `src/components/SortSheet.tsx`, `src/components/RadarView.tsx`, `src/components/LoadingSkeleton.tsx`, `src/components/ApodBanner.tsx`, `src/i18n/en.ts`, `src/i18n/el.ts`
**Catalog sections:** `dashboard`, `card`, `controls`

Follow the shared extraction pattern across all listed files. Add `const { t } = useTranslation();` to each component that renders copy. Commit: `feat: localize dashboard and list components`.

---

### Task 7: Detail, Sentry, Impact, and remaining sheets/components

**Files:** `src/screens/DetailSheet.tsx`, `src/screens/SentryDetailSheet.tsx`, `src/screens/ImpactReportSheet.tsx`, `src/screens/ImpactRiskSheet.tsx`, `src/screens/ApodSheet.tsx`, `src/screens/WatchlistSheet.tsx`, `src/screens/WeekSheet.tsx`, `src/components/ImpactReport.tsx`, `src/components/ApproachTimeline.tsx`, `src/components/ScaleVisual.tsx`, `src/components/TorinoChip.tsx`, `src/components/ThreatGauge.tsx`, `src/components/ApodActions.tsx`, `src/i18n/en.ts`, `src/i18n/el.ts`
**Catalog sections:** `detail`, `sentry`, `impact`, `apod`, `watchlist`, `week`

Follow the shared extraction pattern across all listed files, plus:

- [ ] **REMOVE the Expo-Go hint** at `DetailSheet.tsx:230` ("Note: in Expo Go this is a preview — reminders fire in a development build.") and delete the `{isExpoGo && …}` branch that only rendered it (keep the reminder button itself). Do not catalog it.
- Confirm with `grep -n "Expo Go\|development build\|real build" src/screens/DetailSheet.tsx` that it's gone.

Commit: `feat: localize detail/sentry/impact and remaining sheets`.

---

### Task 8: ApodActions error messages + any stragglers

**Files:** `src/utils/apodImage.ts`, `src/components/ApodActions.tsx`, `src/i18n/en.ts`, `src/i18n/el.ts`
**Catalog section:** `apod` (extend)

The user-safe error strings in `apodImage.ts` ("Could not download the image…", "Gallery permission denied.", etc.) are user-facing. Move them to `apod.*` keys. Since `apodImage.ts` is not a React component, thread `t` into its functions: `downloadApodImage(apod, t)`, `saveApodToGallery(apod, t)`, `setApodAsWallpaper(apod, target, t)`; `ApodActions` passes `t` from `useTranslation()`. Also localize the `apod-wallpaper` JS-layer error (`'Setting wallpaper needs a full app build.'`) via the passed `t`.

Then a **whole-app straggler sweep**:
```bash
grep -rnE ">[A-Z][a-z]+[ <]" src/screens src/components | grep -vE "t\(|colors\.|MaterialCommunityIcons|\{"
```
Inspect remaining hits across all files; key any app-authored literal missed by Tasks 4–7.

Verification: shared pattern + `npx jest` (full suite). Commit: `feat: localize apod actions errors + straggler sweep`.

---

### Task 9: Localize notifications + widget (build-time surfaces)

**Files:** `src/utils/notificationPlan.ts`, `src/utils/notifications.ts`, `src/utils/notificationScheduler.ts`, `src/widget/snapshot.ts`, `src/widget/sync.tsx`, `src/screens/DashboardScreen.tsx`, `src/i18n/en.ts`, `src/i18n/el.ts`
**Catalog sections:** `notify`, `widget`
**Test:** `src/utils/__tests__/notificationPlan.test.ts`, `src/widget/__tests__/snapshot.test.ts` (extend)

**Interfaces:**
- `planDailyDigests(week, digestHour, thresholds, now, t)`, `planSmartAlerts(week, dangerLD, now, t)` — produce localized `title`/`body`.
- `buildWidgetSnapshot(week, thresholds, now, t, locale)` — `threatLabel`, `absoluteTime`, `distance` localized.

- [ ] **Step 1** — Add `notify` + `widget` catalog sections (en + el draft). Widget labels: `nextApproach`, `radar`, `expired`, `tapRefresh`, `tapStart`, `labelHazardous`, `labelCaution`, `labelSafe`. Notify: `digestBody` (`'🌑 %{name} passes %{distance} away — %{threat}'`), digest title, alert title/body, plus the `notify.today`/weekday keys used by `formatApproachTime`.
- [ ] **Step 2** — `notificationPlan.ts`: thread `t` (+ locale where a number is formatted) into both planners; replace hardcoded English with `t('notify.…', { … })`. Update the tests to pass a fake `t` and assert the interpolated key is used.
- [ ] **Step 3** — `notifications.ts`: delete the `EXPO_GO_HINT` constant and any use that surfaced it as user copy (the reminder path just no-ops in Expo Go). Confirm `grep -n "EXPO_GO_HINT\|development build" src/utils/notifications.ts` is empty.
- [ ] **Step 4** — `snapshot.ts`: `buildWidgetSnapshot` takes `t` + `locale`; `threatLabel` via `t('widget.label…')`, `distance` via `formatNumber(missLunar, locale, 1)` + `' LD'`, `absoluteTime` via a localized `formatApproachTime(epochMs, now, t)` ("Today"→`t('notify.today')`, weekday→`t('notify.wd.<n>')`). Update `snapshot.test.ts` to pass a fake `t` returning the key, and assert accordingly. The headless `handler.tsx` is unchanged (renders pre-localized snapshot).
- [ ] **Step 5** — `sync.tsx` + `DashboardScreen.tsx`: pass `t`/`locale` through. `syncWidget(week, thresholds, t, locale, now?)`; the dashboard effect gets `t`/`locale` from `useTranslation()` and passes them to both `syncWidget` and the notification scheduler. Add `t`/`locale` to the effect's dependency array so a language switch reschedules + resyncs.
- [ ] **Step 6** — `npx tsc --noEmit && npx jest` (full suite green); shared mojibake check on `el.ts`.
- [ ] **Step 7** — Commit: `feat: localize notifications and widget at build time`

---

### Task 10: Greek review gate, prebuild, on-device verify

**Files:** none (review + build + verification), unless the user's Greek edits touch `el.ts`.

- [ ] **Step 1 — Greek review gate.** Present `src/i18n/el.ts` to the user (native Greek speaker) for review — especially the jokey `threat.*` and `onboarding.*` copy. Apply any corrections they give, re-run `npx jest src/i18n/__tests__/catalogs.test.ts`, and commit the edits (`chore: apply Greek review edits`). Do not build until they approve the Greek.
- [ ] **Step 2 — Prebuild.** `npx expo prebuild -p android --clean` (stop any Gradle daemon first with `./android/gradlew --stop` if it EBUSYs). Wipes `android/local.properties`.
- [ ] **Step 3 — Recreate `local.properties`** with the Write tool, forward slashes: `sdk.dir=C:/Users/gkout/AppData/Local/Android/Sdk`.
- [ ] **Step 4 — Build.** `JAVA_HOME="C:/Program Files/Microsoft/jdk-17.0.19.10-hotspot" ./android/gradlew -p android :app:assembleRelease` → `BUILD SUCCESSFUL`.
- [ ] **Step 5 — Install.** Find the freshest `app-release.apk` (`android/app/build/...` or `app/build/...`), `adb install -r <path>`; `adb reconnect offline` if needed (MIUI "Install via USB").
- [ ] **Step 6 — Verify (report observed behaviour):**
  1. Fresh start language follows the device (or defaults English); Settings **Language** flips English ↔ Ελληνικά and persists across restart.
  2. All app copy (labels, settings, onboarding, threat verdicts, empty/stale states, errors) switches language; NASA text stays English.
  3. Numbers reformat: Greek `3,4 LD` / `384.400 km`; English `3.4 LD` / `384,400 km`.
  4. Widget and a freshly scheduled notification appear in the selected language after an app-open in that language.
  5. The "needs a real build (not Expo Go)" copy appears nowhere.
  6. A (temporarily removed) Greek key falls back to English, not a raw key. (Spot-check reasoning is fine if not literally removed.)
  7. Phase 1–4b + 3.6 features still work.
- [ ] **Step 7 — Commit** any build artifacts that belong in git (`android/` is generated; commit nothing unless already tracked).

---

## Done criteria

- `npx jest` green; `npx tsc --noEmit` clean; key-parity test passing.
- Greek reviewed and approved by the user.
- Every acceptance criterion in the spec verified on-device in both languages and reported with observed behaviour.
- Then use `superpowers:finishing-a-development-branch` to open the PR for `phase-5-localization`.
