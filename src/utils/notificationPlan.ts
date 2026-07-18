import { Asteroid } from '../types/neo';
import { NeoWeek } from '../api/nasa';
import { getThreatLevel, ThreatThresholds } from './threat';
import type { TFunc } from '../i18n/LocaleContext';
import type { Locale } from '../i18n/i18n';
import { formatNumber } from '../i18n/format';

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

function threatLabel(missLunar: number, thresholds: ThreatThresholds, t: TFunc): string {
  const zone = getThreatLevel(missLunar, thresholds).zone;
  return zone === 'danger' ? t('notify.zoneDanger') : zone === 'watch' ? t('notify.zoneWatch') : t('notify.zoneAllClear');
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
  t: TFunc,
  locale: Locale,
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
      title: t('notify.digestTitle'),
      body: t('notify.digestBody', {
        name: closest.displayName,
        distance: `${formatNumber(closest.missLunar, locale, 1)} LD`,
        threat: threatLabel(closest.missLunar, thresholds, t),
      }),
    });
  }
  return plans;
}

/**
 * One alert per asteroid whose closest approach is in the future and within
 * `dangerLD`; de-duped by id keeping the earliest qualifying approach, sorted
 * ascending by fire time.
 */
export function planSmartAlerts(
  week: NeoWeek,
  dangerLD: number,
  now: number,
  t: TFunc,
  locale: Locale,
): AlertPlan[] {
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
      title: t('notify.alertTitle'),
      body: t('notify.alertBody', { name: a.displayName, distance: `${formatNumber(a.missLunar, locale, 1)} LD` }),
    }));
}
