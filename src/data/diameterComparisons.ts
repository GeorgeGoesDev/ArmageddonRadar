import { TFunc } from '../i18n/LocaleContext';

/**
 * Fun human-scale conversions for an asteroid's estimated diameter.
 *
 * `labelKey`/`pluralKey` point at `scale.landmarks.*` catalog entries rather
 * than holding English text directly, so the comparison sentence localizes.
 */
export interface Landmark {
  labelKey: string;
  pluralKey: string;
  meters: number;
  emoji: string;
}

const COMPARISONS: Landmark[] = [
  { labelKey: 'scale.landmarks.gnome', pluralKey: 'scale.landmarks.gnomePlural', meters: 0.4, emoji: '🗿' },
  { labelKey: 'scale.landmarks.human', pluralKey: 'scale.landmarks.humanPlural', meters: 1.8, emoji: '🧍' },
  { labelKey: 'scale.landmarks.bus', pluralKey: 'scale.landmarks.busPlural', meters: 9, emoji: '🚌' },
  { labelKey: 'scale.landmarks.trex', pluralKey: 'scale.landmarks.trexPlural', meters: 12, emoji: '🦖' },
  { labelKey: 'scale.landmarks.whale', pluralKey: 'scale.landmarks.whalePlural', meters: 30, emoji: '🐋' },
  { labelKey: 'scale.landmarks.boeing747', pluralKey: 'scale.landmarks.boeing747Plural', meters: 70, emoji: '✈️' },
  { labelKey: 'scale.landmarks.statueOfLiberty', pluralKey: 'scale.landmarks.statueOfLibertyPlural', meters: 93, emoji: '🗽' },
  { labelKey: 'scale.landmarks.footballPitch', pluralKey: 'scale.landmarks.footballPitchPlural', meters: 105, emoji: '🏟️' },
  { labelKey: 'scale.landmarks.eiffelTower', pluralKey: 'scale.landmarks.eiffelTowerPlural', meters: 330, emoji: '🗼' },
  { labelKey: 'scale.landmarks.empireStateBuilding', pluralKey: 'scale.landmarks.empireStateBuildingPlural', meters: 443, emoji: '🏙️' },
  { labelKey: 'scale.landmarks.burjKhalifa', pluralKey: 'scale.landmarks.burjKhalifaPlural', meters: 828, emoji: '🌆' },
];

/**
 * The best single reference object for a diameter, with how many of it fit.
 * Prefers a comfortable single-digit count (closest to ~4). Null if the object
 * is smaller than the smallest reference.
 */
export function bestFitLandmark(meters: number): { landmark: Landmark; count: number } | null {
  if (!isFinite(meters) || meters <= 0) return null;
  let best: { landmark: Landmark; count: number; score: number } | null = null;
  for (const comp of COMPARISONS) {
    const count = meters / comp.meters;
    if (count < 0.75) continue;
    const rounded = Math.max(1, Math.round(count));
    const score = Math.abs(Math.log(rounded / 4));
    if (!best || score < best.score) best = { landmark: comp, count: rounded, score };
  }
  return best ? { landmark: best.landmark, count: best.count } : null;
}

/** Friendly comparison string, e.g. "About 6 double-decker buses 🚌". */
export function describeDiameter(meters: number, t: TFunc): string {
  if (!isFinite(meters) || meters <= 0) return t('scale.pebble');
  const fit = bestFitLandmark(meters);
  if (!fit) return t('scale.gnome');
  const { landmark, count } = fit;
  const label = t(count === 1 ? landmark.labelKey : landmark.pluralKey);
  return t('scale.about', { count, label, emoji: landmark.emoji });
}
