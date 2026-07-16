import { DistanceUnit, VelocityUnit } from '../utils/units';
import { DEFAULT_API_KEY } from '../api/nasa';

export interface Settings {
  distanceUnit: DistanceUnit;
  velocityUnit: VelocityUnit;
  dangerLD: number;
  safeLD: number;
  apiKeyOverride: string | null;
  hapticsEnabled: boolean;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  distanceUnit: 'lunar',
  velocityUnit: 'kph',
  dangerLD: 1,
  safeLD: 5,
  apiKeyOverride: null,
  hapticsEnabled: true,
  onboardingComplete: false,
};

const DIST: DistanceUnit[] = ['lunar', 'km', 'miles'];
const VEL: VelocityUnit[] = ['kph', 'mph'];

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Validates arbitrary stored JSON into a complete Settings object. */
export function mergeSettings(stored: unknown): Settings {
  const s = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>;
  let dangerLD = num(s.dangerLD, DEFAULT_SETTINGS.dangerLD);
  let safeLD = num(s.safeLD, DEFAULT_SETTINGS.safeLD);
  if (dangerLD >= safeLD) {
    dangerLD = DEFAULT_SETTINGS.dangerLD;
    safeLD = DEFAULT_SETTINGS.safeLD;
  }
  return {
    distanceUnit: DIST.includes(s.distanceUnit as DistanceUnit) ? (s.distanceUnit as DistanceUnit) : DEFAULT_SETTINGS.distanceUnit,
    velocityUnit: VEL.includes(s.velocityUnit as VelocityUnit) ? (s.velocityUnit as VelocityUnit) : DEFAULT_SETTINGS.velocityUnit,
    dangerLD,
    safeLD,
    apiKeyOverride: typeof s.apiKeyOverride === 'string' && s.apiKeyOverride.trim() ? s.apiKeyOverride.trim() : null,
    hapticsEnabled: typeof s.hapticsEnabled === 'boolean' ? s.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
    onboardingComplete: typeof s.onboardingComplete === 'boolean' ? s.onboardingComplete : DEFAULT_SETTINGS.onboardingComplete,
  };
}

export function resolveApiKey(settings: Settings): string {
  return settings.apiKeyOverride?.trim() || DEFAULT_API_KEY;
}
