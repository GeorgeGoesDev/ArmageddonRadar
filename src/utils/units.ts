/** Formatting + unit conversion helpers. */

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const KM_TO_MILES = 0.621371;

export function formatInt(n: number): string {
  return nf0.format(n);
}

export function formatDiameterRange(minM: number, maxM: number): string {
  return `${nf0.format(minM)} – ${nf0.format(maxM)} m`;
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

export function makeFormatters(prefs: UnitPrefs): Formatters {
  return {
    distanceFromLunar(lunar, kmValue, milesValue) {
      switch (prefs.distanceUnit) {
        case 'km':
          return `${nf0.format(kmValue)} km`;
        case 'miles':
          return `${nf0.format(milesValue)} mi`;
        case 'lunar':
        default:
          return `${nf1.format(lunar)} LD`;
      }
    },
    velocity(kph) {
      return prefs.velocityUnit === 'mph'
        ? `${nf0.format(kph * KM_TO_MILES)} mph`
        : `${nf0.format(kph)} km/h`;
    },
    diameterRange(minM, maxM) {
      return formatDiameterRange(minM, maxM);
    },
    int(n) {
      return nf0.format(n);
    },
  };
}

// Compatibility wrappers (to be removed in Task 11)
export const formatKph = (kph: number) => makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }).velocity(kph);
export const formatMiles = (miles: number) => `${nf0.format(miles)} mi`;
export const formatLunar = (lunar: number) => `${nf1.format(lunar)} LD`;
export const formatKm = (km: number) => `${nf0.format(km)} km`;
