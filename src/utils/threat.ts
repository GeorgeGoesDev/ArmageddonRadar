import { colors } from '../theme/colors';

export type ThreatZone = 'danger' | 'watch' | 'safe';

export interface ThreatThresholds {
  dangerLD: number;
  safeLD: number;
}

export const DEFAULT_THRESHOLDS: ThreatThresholds = { dangerLD: 1, safeLD: 5 };

export interface ThreatLevel {
  t: number;
  zone: ThreatZone;
  verdict: string;
  shortVerdict: string;
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
    return {
      t,
      zone: 'danger',
      verdict: '🚨 Lock your doors. (Just kidding, but it\'s close!)',
      shortVerdict: 'Lock your doors (just kidding… mostly)',
      color: colors.threatOrange,
    };
  }
  if (lunar <= safeLD) {
    return {
      t,
      zone: 'watch',
      verdict: '👀 Keep your eyes on the skies.',
      shortVerdict: 'Keep your eyes on the skies',
      color: colors.threatYellow,
    };
  }
  return {
    t,
    zone: 'safe',
    verdict: '🛡️ Verdict: Not today, space rocks.',
    shortVerdict: 'Not today, space rocks',
    color: colors.safeGreen,
  };
}
