import { useMemo } from 'react';
import { useSettings } from './SettingsContext';
import { useTranslation } from '../i18n/LocaleContext';
import { Formatters, makeFormatters } from '../utils/units';
import { ThreatThresholds } from '../utils/threat';

export function useFormatters(): Formatters {
  const { settings } = useSettings();
  const { locale } = useTranslation();
  return useMemo(
    () => makeFormatters({ distanceUnit: settings.distanceUnit, velocityUnit: settings.velocityUnit }, locale),
    [settings.distanceUnit, settings.velocityUnit, locale],
  );
}

export function useThresholds(): ThreatThresholds {
  const { settings } = useSettings();
  return useMemo(
    () => ({ dangerLD: settings.dangerLD, safeLD: settings.safeLD }),
    [settings.dangerLD, settings.safeLD],
  );
}
