import { Asteroid, NeoFeedResponse, NeoObject } from '../types/neo';
import { getLocalDateKey } from '../utils/dates';

export const NASA_FEED_URL = 'https://api.nasa.gov/neo/rest/v1/feed';

/**
 * API key resolution: prefer a build-time `EXPO_PUBLIC_NASA_API_KEY` (set in
 * `.env`), and fall back to NASA's shared `DEMO_KEY` for zero-config dev.
 * Expo inlines `EXPO_PUBLIC_*` vars at bundle time.
 */
export const DEFAULT_API_KEY =
  process.env.EXPO_PUBLIC_NASA_API_KEY || 'DEMO_KEY';

/** Strips the surrounding parentheses NASA wraps around many designations. */
function cleanName(name: string): string {
  return name.replace(/^\(|\)$/g, '').trim();
}

function num(value: string | number | undefined, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : fallback;
}

/** Normalises a raw NeoWs object into the lean, fully-parsed `Asteroid` model. */
export function normalizeNeo(neo: NeoObject): Asteroid {
  const approach = neo.close_approach_data?.[0];
  const diaMeters = neo.estimated_diameter?.meters;
  const minM = num(diaMeters?.estimated_diameter_min);
  const maxM = num(diaMeters?.estimated_diameter_max);

  return {
    id: neo.id,
    name: neo.name,
    displayName: cleanName(neo.name),
    hazardous: !!neo.is_potentially_hazardous_asteroid,

    diameterMinM: minM,
    diameterMaxM: maxM,
    diameterAvgM: (minM + maxM) / 2,

    // KPH per the requirement (NASA also exposes miles_per_hour).
    velocityKph: num(approach?.relative_velocity?.kilometers_per_hour),

    missLunar: num(approach?.miss_distance?.lunar),
    missKm: num(approach?.miss_distance?.kilometers),
    missMiles: num(approach?.miss_distance?.miles),

    approachEpochMs: num(approach?.epoch_date_close_approach),
    approachDateFull: approach?.close_approach_date_full ?? '',
  };
}

/**
 * Dynamically extracts the asteroid array for `dateKey`. NeoWs keys
 * `near_earth_objects` by date string; if the exact key is missing (e.g. a
 * timezone edge) we gracefully flatten whatever the feed returned.
 */
export function extractAsteroidsForDate(
  response: NeoFeedResponse,
  dateKey: string,
): Asteroid[] {
  const byDate = response.near_earth_objects ?? {};
  const raw = byDate[dateKey] ?? Object.values(byDate).flat();
  return raw.map(normalizeNeo).sort((a, b) => a.missLunar - b.missLunar);
}

export interface FetchNeoOptions {
  apiKey?: string;
  /** Date to fetch; defaults to the local device date (today only). */
  date?: Date;
  signal?: AbortSignal;
}

/**
 * Fetches today's near-Earth objects and returns them normalised and sorted by
 * closest approach first. Throws a descriptive error on non-2xx responses
 * (including the common DEMO_KEY rate-limit 429).
 */
export async function fetchNeoFeed({
  apiKey = DEFAULT_API_KEY,
  date = new Date(),
  signal,
}: FetchNeoOptions = {}): Promise<Asteroid[]> {
  const dateKey = getLocalDateKey(date);
  const url =
    `${NASA_FEED_URL}?start_date=${dateKey}&end_date=${dateKey}` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { signal });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        'NASA rate limit reached (DEMO_KEY allows ~30 requests/hour). ' +
          'Try again later or add your own API key.',
      );
    }
    throw new Error(`NASA API request failed (${res.status} ${res.statusText}).`);
  }

  const data = (await res.json()) as NeoFeedResponse;
  return extractAsteroidsForDate(data, dateKey);
}
