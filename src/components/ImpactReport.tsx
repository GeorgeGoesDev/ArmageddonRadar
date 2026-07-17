import React from 'react';
import { Text, View } from 'react-native';
import { Asteroid } from '../types/neo';
import { computeImpact } from '../utils/impact';
import { ScaleVisual } from './ScaleVisual';
import { getThreatLevel, threatVerdict } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { formatInt } from '../utils/units';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n/LocaleContext';
import type { Locale } from '../i18n/i18n';

function pretty(n: number, locale: Locale): string {
  if (n >= 1000) return formatInt(n, locale);
  if (n >= 1) return n.toPrecision(3);
  return n.toPrecision(2);
}

export function ImpactReport({ asteroid, width }: { asteroid: Asteroid; width: number }) {
  const thresholds = useThresholds();
  const { locale, t } = useTranslation();
  const threat = getThreatLevel(asteroid.missLunar, thresholds);
  const { energyMt, hiroshimas, craterKm, severity } = computeImpact(asteroid.diameterAvgM, asteroid.velocityKph);

  return (
    <View style={{ width, backgroundColor: colors.spaceBlack, padding: 16 }}>
      <Text className="text-xs uppercase tracking-widest" style={{ color: colors.threatOrange }}>{t('impact.reportLabel')}</Text>
      <Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }} numberOfLines={1}>{asteroid.displayName}</Text>

      <View className="mt-3 rounded-2xl p-4" style={{ backgroundColor: colors.spaceSlate }}>
        <Text className="text-lg font-bold" style={{ color: colors.threatOrange }}>{t('impact.megatonsTnt', { value: pretty(energyMt, locale) })}</Text>
        <Text className="text-sm mt-1" style={{ color: colors.textPrimary }}>{t('impact.hiroshimaBombs', { count: formatInt(hiroshimas, locale) })}</Text>
        <Text className="text-sm mt-1" style={{ color: colors.textPrimary }}>{t('impact.craterWidth', { value: craterKm >= 1 ? `${craterKm.toFixed(1)} km` : `${formatInt(craterKm * 1000, locale)} m` })}</Text>
        <Text className="text-sm mt-2 font-semibold" style={{ color: colors.threatYellow }}>{severity}</Text>
      </View>

      <View className="mt-3 rounded-2xl p-2" style={{ backgroundColor: colors.charcoal }}>
        <ScaleVisual diameterM={asteroid.diameterAvgM} width={width - 48} />
      </View>

      <View className="mt-3 rounded-2xl px-4 py-3" style={{ backgroundColor: threat.color }}>
        <Text className="text-center text-sm font-semibold" style={{ color: colors.spaceBlack }}>{threatVerdict(t, threat.zone)}</Text>
      </View>

      <Text className="mt-3 text-center text-[10px] uppercase tracking-widest" style={{ color: colors.textMuted }}>{t('impact.brandFooter')}</Text>
    </View>
  );
}
