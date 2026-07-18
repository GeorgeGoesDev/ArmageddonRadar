/** Formatting + unit conversion helpers. */

import { formatNumber, lunarUnit } from '../i18n/format';
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

export interface UnitPrefs {
  distanceUnit: DistanceUnit;
  velocityUnit: VelocityUnit;
}

export interface Formatters {
  /** Distance display given the value already known in each unit. */
  distanceFromLunar(lunar: number, kmValue: number, milesValue: number): string;
  velocity(kph: number): string;
  diameterRange(minM: number, maxM: number): string;
  int(n: number): string;
}

export function makeFormatters(prefs: UnitPrefs, locale: Locale): Formatters {
  return {
    distanceFromLunar(lunar, kmValue, milesValue) {
      switch (prefs.distanceUnit) {
        case 'km':
          return `${formatNumber(kmValue, locale, 0)} km`;
        case 'miles':
          return `${formatNumber(milesValue, locale, 0)} mi`;
        case 'lunar':
        default:
          return `${formatNumber(lunar, locale, 1)} ${lunarUnit(locale)}`;
      }
    },
    velocity(kph) {
      return prefs.velocityUnit === 'mph'
        ? `${formatNumber(kph * KM_TO_MILES, locale, 0)} mph`
        : `${formatNumber(kph, locale, 0)} km/h`;
    },
    diameterRange(minM, maxM) {
      return formatDiameterRange(minM, maxM, locale);
    },
    int(n) {
      return formatNumber(n, locale, 0);
    },
  };
}
