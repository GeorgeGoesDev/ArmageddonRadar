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

/** Total: always returns a state, never throws — even on a malformed snapshot. */
export function selectNextApproach(snapshot: WidgetSnapshot | null, now: number): WidgetState {
  // Guard the shape, not just null: the snapshot comes from persisted JSON, so a
  // partial write or a reused key could deserialize to something without a valid
  // entries array. The headless handler relies on this never throwing.
  if (!snapshot || !Array.isArray(snapshot.entries) || snapshot.entries.length === 0) {
    return { kind: 'empty' };
  }
  const next = snapshot.entries.find((e) => e.approachEpochMs >= now);
  return next ? { kind: 'live', entry: next } : { kind: 'expired' };
}
