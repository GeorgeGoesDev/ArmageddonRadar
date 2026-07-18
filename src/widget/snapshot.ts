import type { NeoWeek } from '../api/nasa';
import type { Asteroid } from '../types/neo';
import { getThreatLevel, ThreatThresholds } from '../utils/threat';
import type { TFunc } from '../i18n/LocaleContext';
import type { Locale } from '../i18n/i18n';
import { formatNumber } from '../i18n/format';

export interface WidgetEntry {
  name: string;
  distance: string;
  approachEpochMs: number;
  absoluteTime: string;
  threatLabel: string;
  threatColor: string;
}

export interface WidgetChrome {
  nextApproach: string;
  radar: string;
  expired: string;
  tapRefresh: string;
  tapStart: string;
}

export interface WidgetSnapshot {
  entries: WidgetEntry[];
  builtAtMs: number;
  chrome: WidgetChrome;
}

export type WidgetState =
  | { kind: 'live'; entry: WidgetEntry; chrome: WidgetChrome }
  | { kind: 'expired'; chrome: WidgetChrome }
  | { kind: 'empty'; chrome: WidgetChrome };

const MAX_ENTRIES = 10;

// English fallback chrome for the empty state when NO snapshot exists yet (a
// fresh install / widget-added-before-first-open — the headless task has no
// locale then, so it can't call `t`).
const DEFAULT_CHROME: WidgetChrome = {
  nextApproach: 'NEXT APPROACH',
  radar: 'RADAR',
  expired: 'Radar data expired',
  tapRefresh: 'Tap to refresh',
  tapStart: 'Tap to start tracking',
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Local "Today HH:MM" for same-day, else "Wkd HH:MM". No Intl (Hermes-safe). */
export function formatApproachTime(epochMs: number, now: number, t: TFunc): string {
  const d = new Date(epochMs);
  const n = new Date(now);
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
  return sameDay ? `${t('widget.today')} ${time}` : `${t('widget.wd' + d.getDay())} ${time}`;
}

function threatLabelFor(zone: 'danger' | 'watch' | 'safe', t: TFunc): string {
  return zone === 'danger' ? t('widget.labelHazardous') : zone === 'watch' ? t('widget.labelCaution') : t('widget.labelSafe');
}

/** Next up-to-10 future approaches, ascending, pre-formatted for the widget. */
export function buildWidgetSnapshot(
  week: NeoWeek,
  thresholds: ThreatThresholds,
  now: number,
  t: TFunc,
  locale: Locale,
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
        distance: `${formatNumber(a.missLunar, locale, 1)} LD`,
        approachEpochMs: a.approachEpochMs,
        absoluteTime: formatApproachTime(a.approachEpochMs, now, t),
        threatLabel: threatLabelFor(threat.zone, t),
        threatColor: threat.color,
      };
    });
  const chrome: WidgetChrome = {
    nextApproach: t('widget.nextApproach'),
    radar: t('widget.radar'),
    expired: t('widget.expired'),
    tapRefresh: t('widget.tapRefresh'),
    tapStart: t('widget.tapStart'),
  };
  return { entries, builtAtMs: now, chrome };
}

/** Total: always returns a state, never throws — even on a malformed snapshot. */
export function selectNextApproach(snapshot: WidgetSnapshot | null, now: number): WidgetState {
  // Guard the shape, not just null: the snapshot comes from persisted JSON, so a
  // partial write or a reused key could deserialize to something without a valid
  // entries array. The headless handler relies on this never throwing.
  // A pre-i18n (Phase 4b) snapshot survives the upgrade under the same
  // `widget:snapshot:v1` key with `entries` but no `chrome`, so default it in
  // every branch — the headless render dereferences chrome and would crash on
  // `undefined`.
  const chrome = snapshot?.chrome ?? DEFAULT_CHROME;
  if (!snapshot || !Array.isArray(snapshot.entries) || snapshot.entries.length === 0) {
    return { kind: 'empty', chrome };
  }
  const next = snapshot.entries.find((e) => e.approachEpochMs >= now);
  return next ? { kind: 'live', entry: next, chrome } : { kind: 'expired', chrome };
}
