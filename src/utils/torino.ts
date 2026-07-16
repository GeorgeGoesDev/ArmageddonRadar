import { colors } from '../theme/colors';

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Torino Scale colour: 0 calm → 10 certain collision. */
export function torinoColor(level: number): string {
  if (level >= 8) return '#FF1744';
  if (level >= 5) return colors.threatOrange;
  if (level >= 1) return colors.threatYellow;
  return colors.textMuted;
}

/** Cumulative impact probability → "1 in N" odds. */
export function formatOdds(impactProb: number): string {
  if (!Number.isFinite(impactProb) || impactProb <= 0) return '~0';
  return `1 in ${nf0.format(Math.round(1 / impactProb))}`;
}
