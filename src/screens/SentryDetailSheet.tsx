import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SentryRisk } from '../types/sentry';
import { useSentryDetail } from '../hooks/useSentryDetail';
import { TorinoChip } from '../components/TorinoChip';
import { formatOdds } from '../utils/torino';
import { formatInt } from '../utils/units';
import { formatNumber } from '../i18n/format';
import { useTranslation } from '../i18n/LocaleContext';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
      <Text className="text-sm" style={{ color: colors.textMuted }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

const TORINO_CAPTION_KEY: Record<number, string> = {
  0: 'sentry.noUnusualDanger',
  1: 'sentry.routineCaption',
};

export function SentryDetailSheet({ risk, onClose }: { risk: SentryRisk | null; onClose: () => void }) {
  const { data, isLoading, isError } = useSentryDetail(risk?.designation ?? null);
  const { locale, t } = useTranslation();
  if (!risk) return null;

  return (
    <Modal visible={!!risk} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, height: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-xl font-extrabold flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>{risk.name}</Text>
            <Pressable onPress={onClose} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} /></Pressable>
          </View>

          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView className="px-5" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
              <TorinoChip level={risk.torinoMax} />
              <Text className="text-xs" style={{ color: colors.textMuted }}>{t(TORINO_CAPTION_KEY[risk.torinoMax] ?? 'sentry.elevatedCaption')}</Text>
            </View>

            <Row label={t('sentry.impactProbability')} value={`${formatOdds(risk.impactProb)} (${(risk.impactProb * 100).toExponential(1)}%)`} />
            <Row label={t('sentry.potentialImpacts')} value={t('sentry.potentialImpactsValue', { count: risk.nImpacts, range: risk.yearRange })} />
            <Row label={t('sentry.estimatedDiameter')} value={`${formatInt(risk.estDiameterM, locale)} m`} />
            <Row label={t('sentry.palermoCumulative')} value={formatNumber(risk.palermoCum, locale, 2)} />

            {isLoading && <View className="py-6 items-center"><ActivityIndicator color={colors.accentBlue} /></View>}
            {isError && <Text className="py-6 text-center text-xs" style={{ color: colors.textMuted }}>{t('sentry.extendedRiskUnavailable')}</Text>}
            {data && (
              <>
                <Row label={t('sentry.palermoMax')} value={formatNumber(data.palermoMax, locale, 2)} />
                <Row label={t('sentry.impactEnergy')} value={`${formatInt(data.energyMt, locale)} MT TNT`} />
                <Row label={t('sentry.mass')} value={`${data.massKg.toExponential(2)} kg`} />
                <Row label={t('sentry.velocityInf')} value={`${formatNumber(data.vInfKps, locale, 1)} km/s`} />
                <Row label={t('sentry.firstObserved')} value={data.firstObs} />
                <Row label={t('sentry.lastObserved')} value={data.lastObs} />
              </>
            )}
          </ScrollView>
          </SafeAreaView>
        </View>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}
