/**
 * TypeScript interfaces for the NASA NeoWs (Near Earth Object Web Service)
 * Feed API response.
 *
 * Endpoint: https://api.nasa.gov/neo/rest/v1/feed
 * Docs:     https://api.nasa.gov/  (Asteroids - NeoWs)
 *
 * The raw payload is intentionally verbose; we normalise it into the leaner
 * `Asteroid` shape (see `normalizeNeo`) before it reaches the UI.
 */

export interface NeoDiameterRange {
  estimated_diameter_min: number;
  estimated_diameter_max: number;
}

export interface NeoEstimatedDiameter {
  kilometers: NeoDiameterRange;
  meters: NeoDiameterRange;
  miles: NeoDiameterRange;
  feet: NeoDiameterRange;
}

export interface NeoRelativeVelocity {
  kilometers_per_second: string;
  kilometers_per_hour: string;
  miles_per_hour: string;
}

export interface NeoMissDistance {
  astronomical: string;
  lunar: string;
  kilometers: string;
  miles: string;
}

export interface NeoCloseApproachData {
  close_approach_date: string;
  close_approach_date_full: string;
  epoch_date_close_approach: number;
  relative_velocity: NeoRelativeVelocity;
  miss_distance: NeoMissDistance;
  orbiting_body: string;
}

export interface NeoObject {
  links?: { self: string };
  id: string;
  neo_reference_id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: NeoEstimatedDiameter;
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: NeoCloseApproachData[];
  is_sentry_object: boolean;
}

export interface NeoFeedResponse {
  links?: { next?: string; prev?: string; self: string };
  element_count: number;
  /** Keyed by date string, e.g. `"2026-07-15"`. */
  near_earth_objects: Record<string, NeoObject[]>;
}

/**
 * The normalised, UI-friendly asteroid model. All numeric fields are parsed
 * from the API's stringly-typed payload so components never parse in render.
 */
export interface Asteroid {
  id: string;
  name: string;
  /** Cleaned display name with surrounding parentheses stripped. */
  displayName: string;
  hazardous: boolean;

  diameterMinM: number;
  diameterMaxM: number;
  diameterAvgM: number;

  /** Closest-approach speed, in km/h (per the KPH requirement). */
  velocityKph: number;

  missLunar: number;
  missKm: number;
  missMiles: number;

  /** Epoch ms of the closest approach — used to schedule reminders. */
  approachEpochMs: number;
  approachDateFull: string;
}
