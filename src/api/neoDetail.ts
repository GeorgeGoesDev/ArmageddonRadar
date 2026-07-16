import { NeoDetail, ApproachEntry, OrbitalElements } from '../types/neoDetail';
import { DEFAULT_API_KEY } from './nasa';

const NEO_URL = 'https://api.nasa.gov/neo/rest/v1/neo';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeNeoDetail(raw: any): NeoDetail {
  const od = raw.orbital_data ?? {};
  const orbital: OrbitalElements = {
    semiMajorAxisAu: num(od.semi_major_axis),
    eccentricity: num(od.eccentricity),
    inclinationDeg: num(od.inclination),
    orbitalPeriodDays: num(od.orbital_period),
    perihelionAu: num(od.perihelion_distance),
    aphelionAu: num(od.aphelion_distance),
    orbitClassType: String(od.orbit_class?.orbit_class_type ?? ''),
    orbitClassDescription: String(od.orbit_class?.orbit_class_description ?? ''),
    firstObservation: String(od.first_observation_date ?? ''),
    lastObservation: String(od.last_observation_date ?? ''),
  };
  const approaches: ApproachEntry[] = (raw.close_approach_data ?? [])
    .map((a: any) => ({
      epochMs: num(a.epoch_date_close_approach),
      dateFull: String(a.close_approach_date_full ?? ''),
      missLunar: num(a.miss_distance?.lunar),
      missKm: num(a.miss_distance?.kilometers),
      velocityKph: num(a.relative_velocity?.kilometers_per_hour),
      orbitingBody: String(a.orbiting_body ?? 'Earth'),
    }))
    .sort((a: ApproachEntry, b: ApproachEntry) => a.epochMs - b.epochMs);

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    absoluteMagnitude: num(raw.absolute_magnitude_h),
    isHazardous: !!raw.is_potentially_hazardous_asteroid,
    orbital,
    approaches,
  };
}

export async function fetchNeoDetail(
  id: string,
  apiKey: string = DEFAULT_API_KEY,
  signal?: AbortSignal,
): Promise<NeoDetail> {
  const res = await fetch(`${NEO_URL}/${encodeURIComponent(id)}?api_key=${encodeURIComponent(apiKey)}`, { signal });
  if (!res.ok) {
    throw new Error(`NASA lookup failed (${res.status} ${res.statusText}).`);
  }
  return normalizeNeoDetail(await res.json());
}
