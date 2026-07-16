/**
 * Fun human-scale conversions for an asteroid's estimated diameter.
 */
export interface Landmark {
  singular: string;
  plural: string;
  meters: number;
  emoji: string;
}

const COMPARISONS: Landmark[] = [
  { singular: 'garden gnome', plural: 'garden gnomes', meters: 0.4, emoji: '🗿' },
  { singular: 'human', plural: 'humans', meters: 1.8, emoji: '🧍' },
  { singular: 'double-decker bus', plural: 'double-decker buses', meters: 9, emoji: '🚌' },
  { singular: 'T-Rex', plural: 'T-Rexes', meters: 12, emoji: '🦖' },
  { singular: 'blue whale', plural: 'blue whales', meters: 30, emoji: '🐋' },
  { singular: 'Boeing 747', plural: 'Boeing 747s', meters: 70, emoji: '✈️' },
  { singular: 'Statue of Liberty', plural: 'Statues of Liberty', meters: 93, emoji: '🗽' },
  { singular: 'football pitch', plural: 'football pitches', meters: 105, emoji: '🏟️' },
  { singular: 'Eiffel Tower', plural: 'Eiffel Towers', meters: 330, emoji: '🗼' },
  { singular: 'Empire State Building', plural: 'Empire State Buildings', meters: 443, emoji: '🏙️' },
  { singular: 'Burj Khalifa', plural: 'Burj Khalifas', meters: 828, emoji: '🌆' },
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
export function describeDiameter(meters: number): string {
  if (!isFinite(meters) || meters <= 0) return 'Roughly pebble-sized 🪨';
  const fit = bestFitLandmark(meters);
  if (!fit) return 'Smaller than a garden gnome 🗿';
  const { landmark, count } = fit;
  const label = count === 1 ? landmark.singular : landmark.plural;
  const article = count === 1 ? 'About 1' : `About ${count}`;
  return `${article} ${label} ${landmark.emoji}`;
}
