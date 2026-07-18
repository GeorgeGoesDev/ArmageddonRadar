import {
  buildWidgetSnapshot,
  selectNextApproach,
  formatApproachTime,
  WidgetSnapshot,
} from '../snapshot';
import type { NeoWeek } from '../../api/nasa';
import type { Asteroid } from '../../types/neo';

const thresholds = { dangerLD: 1, safeLD: 5 };

// Fake `t`: returns the key itself (with any params appended) so assertions
// can check the right catalog key was requested without depending on i18n-js.
function fakeT(key: string, params?: Record<string, unknown>): string {
  if (!params) return key;
  return `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})`;
}

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
    const snap = buildWidgetSnapshot(week, thresholds, NOW, fakeT, 'en');
    expect(snap.entries.map((e) => e.name)).toEqual(['soon', 'later']);
    expect(snap.entries[0].distance).toBe('3.4 LD');
    expect(snap.entries[0].threatLabel).toBe('widget.labelCaution'); // 1 <= 3.4 <= 5 -> watch
    expect(snap.entries.length).toBeLessThanOrEqual(10);
  });

  it('returns an empty snapshot for an all-past / empty feed', () => {
    expect(buildWidgetSnapshot({ '2026-07-17': [ast('p', 2, NOW - HOUR)] }, thresholds, NOW, fakeT, 'en').entries).toEqual([]);
    expect(buildWidgetSnapshot({}, thresholds, NOW, fakeT, 'en').entries).toEqual([]);
  });

  it('labels a sub-danger object HAZARDOUS', () => {
    const snap = buildWidgetSnapshot({ '2026-07-17': [ast('close', 0.5, NOW + HOUR)] }, thresholds, NOW, fakeT, 'en');
    expect(snap.entries[0].threatLabel).toBe('widget.labelHazardous');
  });

  it('formats the distance with locale-specific separators', () => {
    const snap = buildWidgetSnapshot({ '2026-07-17': [ast('far', 1234.5, NOW + HOUR)] }, thresholds, NOW, fakeT, 'el');
    expect(snap.entries[0].distance).toBe('1.234,5 LD');
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

  it('is empty (never throws) on a malformed persisted snapshot', () => {
    // Persisted JSON could deserialize to a shape without a valid entries array.
    const malformed = [
      123,
      'oops',
      {},
      { builtAtMs: NOW },
      { entries: null, builtAtMs: NOW },
      { entries: 'nope', builtAtMs: NOW },
    ];
    for (const m of malformed) {
      expect(selectNextApproach(m as unknown as WidgetSnapshot, NOW).kind).toBe('empty');
    }
  });

  it('treats an approach exactly at now as live (inclusive)', () => {
    expect(selectNextApproach(snap, NOW + HOUR).kind).toBe('live');
  });
});

describe('formatApproachTime', () => {
  it('uses widget.today for the same local day', () => {
    expect(formatApproachTime(new Date(2026, 6, 17, 14, 20).getTime(), NOW, fakeT)).toBe('widget.today 14:20');
  });
  it('uses the matching weekday key for another day and zero-pads', () => {
    // 2026-07-18 is a Saturday (day 6).
    expect(formatApproachTime(new Date(2026, 6, 18, 3, 5).getTime(), NOW, fakeT)).toBe('widget.wd6 03:05');
  });
});
