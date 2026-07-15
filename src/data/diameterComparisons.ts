/**
 * Fun human-scale conversions for an asteroid's estimated diameter.
 *
 * Each entry is roughly how long/tall the object is in metres. We pick the
 * comparison whose count lands closest to a "nice" small number so the result
 * reads naturally, e.g. "≈ 6 double-decker buses 🚌".
 */
interface Comparison {
  singular: string;
  plural: string;
  meters: number;
  emoji: string;
}

const COMPARISONS: Comparison[] = [
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
 * Returns a friendly comparison string for a diameter in metres. Chooses the
 * reference object that yields the most human-readable count (ideally 1–9).
 */
export function describeDiameter(meters: number): string {
  if (!isFinite(meters) || meters <= 0) return 'Roughly pebble-sized 🪨';

  // Score each comparison: prefer counts in the 1–9 range, closest to ~4.
  let best: { comp: Comparison; count: number; score: number } | null = null;
  for (const comp of COMPARISONS) {
    const count = meters / comp.meters;
    if (count < 0.75) continue; // object is smaller than one of these
    const rounded = Math.max(1, Math.round(count));
    // Penalise counts far from a comfortable single digit.
    const score = Math.abs(Math.log(rounded / 4));
    if (!best || score < best.score) best = { comp, count: rounded, score };
  }

  if (!best) {
    // Smaller than our smallest reference.
    return 'Smaller than a garden gnome 🗿';
  }

  const { comp, count } = best;
  const label = count === 1 ? comp.singular : comp.plural;
  const article = count === 1 ? 'About 1' : `About ${count}`;
  return `${article} ${label} ${comp.emoji}`;
}
