import { NeoFeedResponse, NeoObject } from '../types/neo';
import { extractAsteroidsForDate } from '../api/nasa';
import { getLocalDateKey } from '../utils/dates';
import { Asteroid } from '../types/neo';

/**
 * Schema-accurate mock NeoWs data so the UI can be built and demoed without
 * hitting NASA's rate limits. Shapes match the real API exactly; the builder
 * stamps in the current date + plausible approach times so reminders land in
 * the future.
 */

interface MockSeed {
  id: string;
  name: string;
  hazardous: boolean;
  diaMinM: number;
  diaMaxM: number;
  kph: number;
  lunar: number;
  /** Hours from local midnight for the closest approach (some in the future). */
  approachHour: number;
}

const SEEDS: MockSeed[] = [
  { id: '2465633', name: '(2009 JR5)', hazardous: true, diaMinM: 462, diaMaxM: 1033, kph: 66790, lunar: 0.72, approachHour: 21 },
  { id: '3892128', name: '(2019 XQ1)', hazardous: false, diaMinM: 28, diaMaxM: 62, kph: 31240, lunar: 2.4, approachHour: 16 },
  { id: '54016469', name: '(2020 SR6)', hazardous: true, diaMinM: 120, diaMaxM: 268, kph: 84120, lunar: 3.9, approachHour: 23 },
  { id: '3726710', name: '(2015 RC)', hazardous: false, diaMinM: 9, diaMaxM: 20, kph: 18450, lunar: 6.8, approachHour: 11 },
  { id: '3986741', name: '(2020 BW12)', hazardous: false, diaMinM: 47, diaMaxM: 105, kph: 42980, lunar: 9.3, approachHour: 8 },
  { id: '54051234', name: '(2026 XY)', hazardous: false, diaMinM: 3, diaMaxM: 7, kph: 24310, lunar: 14.1, approachHour: 19 },
];

const LUNAR_TO_KM = 384400;
const KM_TO_MILES = 0.621371;
const LUNAR_TO_AU = 0.0025696;

function buildNeoObject(seed: MockSeed, dateKey: string, epochMs: number): NeoObject {
  const km = seed.lunar * LUNAR_TO_KM;
  const kps = seed.kph / 3600;
  return {
    id: seed.id,
    neo_reference_id: seed.id,
    name: seed.name,
    nasa_jpl_url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${seed.id}`,
    absolute_magnitude_h: 21.3,
    estimated_diameter: {
      kilometers: {
        estimated_diameter_min: seed.diaMinM / 1000,
        estimated_diameter_max: seed.diaMaxM / 1000,
      },
      meters: {
        estimated_diameter_min: seed.diaMinM,
        estimated_diameter_max: seed.diaMaxM,
      },
      miles: {
        estimated_diameter_min: (seed.diaMinM / 1000) * KM_TO_MILES,
        estimated_diameter_max: (seed.diaMaxM / 1000) * KM_TO_MILES,
      },
      feet: {
        estimated_diameter_min: seed.diaMinM * 3.28084,
        estimated_diameter_max: seed.diaMaxM * 3.28084,
      },
    },
    is_potentially_hazardous_asteroid: seed.hazardous,
    close_approach_data: [
      {
        close_approach_date: dateKey,
        close_approach_date_full: new Date(epochMs)
          .toISOString()
          .replace('T', ' ')
          .slice(0, 16),
        epoch_date_close_approach: epochMs,
        relative_velocity: {
          kilometers_per_second: kps.toFixed(4),
          kilometers_per_hour: seed.kph.toFixed(2),
          miles_per_hour: (seed.kph * KM_TO_MILES).toFixed(2),
        },
        miss_distance: {
          astronomical: (seed.lunar * LUNAR_TO_AU).toFixed(6),
          lunar: seed.lunar.toFixed(2),
          kilometers: km.toFixed(1),
          miles: (km * KM_TO_MILES).toFixed(1),
        },
        orbiting_body: 'Earth',
      },
    ],
    is_sentry_object: false,
  };
}

/** Builds a full, schema-accurate feed response for the given local date. */
export function buildMockFeedResponse(
  date: Date = new Date(),
): NeoFeedResponse {
  const dateKey = getLocalDateKey(date);
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  const objects = SEEDS.map((seed) => {
    const epochMs = midnight.getTime() + seed.approachHour * 3600_000;
    return buildNeoObject(seed, dateKey, epochMs);
  });

  return {
    element_count: objects.length,
    near_earth_objects: { [dateKey]: objects },
  };
}

/** Convenience: mock data already normalised the same way the live path is. */
export function getMockAsteroids(date: Date = new Date()): Asteroid[] {
  return extractAsteroidsForDate(buildMockFeedResponse(date), getLocalDateKey(date));
}
