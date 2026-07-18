export interface ImpactResult {
  energyMt: number;
  hiroshimas: number;
  craterKm: number;
  /** Catalog key (`impact.sev*`) — resolve with `t()` before displaying. */
  severity: string;
}

const IMPACTOR_DENSITY = 3000; // kg/m^3 (stony)
const TARGET_DENSITY = 2500;
const G = 9.81;
const JOULES_PER_MT = 4.184e15;
const HIROSHIMA_MT = 0.015;

/**
 * Torino-independent plain-language severity by energy (megatons TNT).
 * Returns a catalog key (`impact.sev*`) — not display text — so this module
 * stays free of `t` (pure/testable); callers resolve it via `t()` at render.
 */
export function severityFor(energyMt: number): string {
  if (energyMt < 0.001) return 'impact.sevAirburst';
  if (energyMt < 1) return 'impact.sevTown';
  if (energyMt < 100) return 'impact.sevCity';
  if (energyMt < 1e4) return 'impact.sevRegional';
  if (energyMt < 1e6) return 'impact.sevContinental';
  return 'impact.sevExtinction';
}

/**
 * Relatable impact estimate from diameter (m) + speed (km/h). Kinetic energy
 * → megatons + Hiroshima equivalents; crater via Collins et al. pi-scaling
 * (vertical impact), final simple crater = 1.25 × transient.
 */
export function computeImpact(diameterM: number, velocityKph: number): ImpactResult {
  const r = diameterM / 2;
  const volume = (4 / 3) * Math.PI * r ** 3;
  const mass = IMPACTOR_DENSITY * volume;
  const v = velocityKph / 3.6; // m/s
  const energyJ = 0.5 * mass * v * v;
  const energyMt = energyJ / JOULES_PER_MT;
  const hiroshimas = energyMt / HIROSHIMA_MT;

  const transient =
    1.161 *
    Math.pow(IMPACTOR_DENSITY / TARGET_DENSITY, 1 / 3) *
    Math.pow(diameterM, 0.78) *
    Math.pow(v, 0.44) *
    Math.pow(G, -0.22);
  const craterKm = (1.25 * transient) / 1000;

  return { energyMt, hiroshimas, craterKm, severity: severityFor(energyMt) };
}
