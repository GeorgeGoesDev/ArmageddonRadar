import { Asteroid } from '../../types/neo';
import { NeoWeek } from '../../api/nasa';
import { planDailyDigests, planSmartAlerts } from '../notificationPlan';
import { en } from '../../i18n/en';

const thresholds = { dangerLD: 1, safeLD: 5 };

// Fake `t`: interpolates against the real en catalog so assertions can check
// the actual wording without depending on i18n-js at all.
function fakeT(key: string, params?: Record<string, unknown>): string {
  const value = key.split('.').reduce<unknown>((obj, k) => (obj as Record<string, unknown>)?.[k], en);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`%{${k}}`, String(v)), value);
}

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
    const plans = planDailyDigests(week, 9, thresholds, now, fakeT, 'en');
    expect(plans.map((p) => p.dayKey)).toEqual(['2099-01-01', '2099-01-02']);
    expect(plans[0].body).toBe('🌑 Bravo passes 0.5 LD away — DANGER');
    expect(plans[1].body).toBe('🌑 Charlie passes 8.0 LD away — ALL CLEAR');
    // Robust em-dash guard: fromCodePoint is ASCII source, so it yields a real
    // U+2014 at runtime regardless of this file's encoding. If the implementation
    // double-encoded its em-dash literal, the body won't contain a real U+2014
    // and this fails even if the toBe above co-mojibaked to a false pass.
    expect(plans[0].body).toContain(String.fromCodePoint(0x2014));
  });
  it('fires at digestHour local time', () => {
    const p = planDailyDigests(week, 9, thresholds, now, fakeT, 'en')[0];
    expect(p.fireDate.getHours()).toBe(9);
  });
  it('title starts with the 🌑 code point (mojibake guard)', () => {
    const p = planDailyDigests(week, 9, thresholds, now, fakeT, 'en')[0];
    expect(p.title.codePointAt(0)).toBe(0x1f311);
  });
  it('skips a day whose digestHour has already passed', () => {
    const after = new Date(2099, 0, 1, 10, 0, 0).getTime(); // past 09:00 on day 1
    const plans = planDailyDigests(week, 9, thresholds, after, fakeT, 'en');
    expect(plans.map((p) => p.dayKey)).toEqual(['2099-01-02']);
  });
  it('returns [] for an empty feed', () => {
    expect(planDailyDigests({}, 9, thresholds, now, fakeT, 'en')).toEqual([]);
  });
  it('skips a day whose digest fire instant equals `now` exactly (inclusive boundary)', () => {
    const dayKey = '2101-03-10';
    const digestHour = 9;
    const [y, m, d] = dayKey.split('-').map(Number);
    const exactNow = new Date(y, m - 1, d, digestHour, 0, 0, 0).getTime();
    const boundaryWeek: NeoWeek = {
      [dayKey]: [mkAst({ id: 'q', displayName: 'Quebec', missLunar: 4 })],
    };
    const plans = planDailyDigests(boundaryWeek, digestHour, thresholds, exactNow, fakeT, 'en');
    expect(plans).toEqual([]);
  });
  it('formats the distance with locale-specific separators', () => {
    const bigWeek: NeoWeek = {
      '2099-01-01': [mkAst({ id: 'd', displayName: 'Delta', missLunar: 1234.5 })],
    };
    const p = planDailyDigests(bigWeek, 9, thresholds, now, fakeT, 'el')[0];
    expect(p.body).toContain('1.234,5 LD');
  });
});

describe('planSmartAlerts', () => {
  const now = 1_000_000;
  it('selects future, within-threshold objects and de-dupes by id (earliest approach)', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'a', displayName: 'Alpha', missLunar: 0.5, approachEpochMs: now + 30_000 }), mkAst({ id: 'b', missLunar: 2, approachEpochMs: now + 20_000 })],
      d2: [mkAst({ id: 'a', displayName: 'Alpha', missLunar: 0.7, approachEpochMs: now + 10_000 }), mkAst({ id: 'c', missLunar: 0.8, approachEpochMs: now - 5_000 })],
    };
    const alerts = planSmartAlerts(week, 1, now, fakeT);
    expect(alerts.map((x) => x.asteroidId)).toEqual(['a']); // b too far, c in the past
    expect(alerts[0].fireDate.getTime()).toBe(now + 10_000); // earliest of a's two approaches
    expect(alerts[0].title.codePointAt(0)).toBe(0x2604); // ☄️ guard
    expect(alerts[0].body).toBe('Alpha passes 0.7 LD away at closest approach.');
  });
  it('sorts alerts ascending by fireDate', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'x', missLunar: 0.9, approachEpochMs: now + 50_000 }), mkAst({ id: 'y', missLunar: 0.2, approachEpochMs: now + 10_000 })],
    };
    expect(planSmartAlerts(week, 1, now, fakeT).map((a) => a.asteroidId)).toEqual(['y', 'x']);
  });
  it('returns [] when nothing qualifies', () => {
    const week: NeoWeek = { d1: [mkAst({ id: 'z', missLunar: 9, approachEpochMs: now + 1000 })] };
    expect(planSmartAlerts(week, 1, now, fakeT)).toEqual([]);
  });
  it('includes an object whose missLunar exactly equals dangerLD (inclusive threshold)', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'p', missLunar: 1, approachEpochMs: now + 5_000 })],
    };
    expect(planSmartAlerts(week, 1, now, fakeT).map((a) => a.asteroidId)).toEqual(['p']);
  });
  it('excludes an object whose approachEpochMs exactly equals `now` (exclusive future check)', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'p', missLunar: 0.5, approachEpochMs: now })],
    };
    expect(planSmartAlerts(week, 1, now, fakeT)).toEqual([]);
  });
  it('dedupes by id keeping the earliest occurrence, even when the earliest is iterated first', () => {
    const week: NeoWeek = {
      d1: [mkAst({ id: 'a', missLunar: 0.5, approachEpochMs: now + 10_000 })], // earliest, inserted first
      d2: [mkAst({ id: 'a', missLunar: 0.5, approachEpochMs: now + 30_000 })], // later, inserted second
    };
    const alerts = planSmartAlerts(week, 1, now, fakeT);
    expect(alerts.map((a) => a.asteroidId)).toEqual(['a']);
    expect(alerts[0].fireDate.getTime()).toBe(now + 10_000);
  });
});
