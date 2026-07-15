import { useMemo } from 'react';
import { useSettings } from './SettingsContext';
import { Formatters, makeFormatters } from '../utils/units';
import { ThreatThresholds } from '../utils/threat';

export function useFormatters(): Formatters {
  const { settings } = useSettings();
  return useMemo(
    () => makeFormatters({ distanceUnit: settings.distanceUnit, velocityUnit: settings.velocityUnit }),
    [settings.distanceUnit, settings.velocityUnit],
  );
}

export function useThresholds(): ThreatThresholds {
  const { settings } = useSettings();
  return useMemo(
    () => ({ dangerLD: settings.dangerLD, safeLD: settings.safeLD }),
    [settings.dangerLD, settings.safeLD],
  );
}
