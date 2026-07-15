import { colors } from '../theme/colors';

export type ThreatZone = 'danger' | 'watch' | 'safe';

export interface ThreatLevel {
  /** Normalised threat 0 (completely safe) → 1 (red alert). Drives the gauge. */
  t: number;
  zone: ThreatZone;
  /** The cheeky verdict banner copy. */
  verdict: string;
  /** A terse verdict for the share string. */
  shortVerdict: string;
  /** Accent colour for this zone. */
  color: string;
}

/** Below this many lunar distances we treat things as "red alert". */
export const DANGER_LD = 1;
/** At/above this many lunar distances we treat things as "completely safe". */
export const SAFE_LD = 5;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Maps the closest asteroid's miss distance (in lunar distances) to a threat
 * level. Anything under 1 LD pushes the needle toward red; anything at or above
 * 5 LD sits fully in the safe zone.
 */
export function getThreatLevel(lunar: number): ThreatLevel {
  // Linear scale: 5 LD → 0, 0 LD → 1. (1 LD lands at t = 0.8, near red.)
  const t = clamp01((SAFE_LD - lunar) / SAFE_LD);

  if (lunar < DANGER_LD) {
    return {
      t,
      zone: 'danger',
      verdict: '🚨 Lock your doors. (Just kidding, but it’s close!)',
      shortVerdict: 'Lock your doors (just kidding… mostly)',
      color: colors.threatOrange,
    };
  }

  if (lunar <= SAFE_LD) {
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
