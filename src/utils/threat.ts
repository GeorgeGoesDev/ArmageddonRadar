import { colors } from '../theme/colors';
import type { TFunc } from '../i18n/LocaleContext';

export type ThreatZone = 'danger' | 'watch' | 'safe';

export interface ThreatThresholds {
  dangerLD: number;
  safeLD: number;
}

export const DEFAULT_THRESHOLDS: ThreatThresholds = { dangerLD: 1, safeLD: 5 };

export interface ThreatLevel {
  t: number;
  zone: ThreatZone;
  color: string;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Maps the closest asteroid's miss distance (lunar distances) to a threat
 * level. Anything under `dangerLD` reads as red alert; anything at/above
 * `safeLD` sits fully safe.
 */
export function getThreatLevel(
  lunar: number,
  thresholds: ThreatThresholds = DEFAULT_THRESHOLDS,
): ThreatLevel {
  const { dangerLD, safeLD } = thresholds;
  const t = clamp01((safeLD - lunar) / safeLD);

  if (lunar < dangerLD) {
    return { t, zone: 'danger', color: colors.threatOrange };
  }
  if (lunar <= safeLD) {
    return { t, zone: 'watch', color: colors.threatYellow };
  }
  return { t, zone: 'safe', color: colors.safeGreen };
}

const VERDICT: Record<ThreatZone, string> = {
  danger: 'threat.hazardVerdict',
  watch: 'threat.watchVerdict',
  safe: 'threat.safeVerdict',
};
const SHORT: Record<ThreatZone, string> = {
  danger: 'threat.hazardShort',
  watch: 'threat.watchShort',
  safe: 'threat.safeShort',
};

export function threatVerdict(t: TFunc, zone: ThreatZone): string {
  return t(VERDICT[zone]);
}

export function threatShortVerdict(t: TFunc, zone: ThreatZone): string {
  return t(SHORT[zone]);
}
