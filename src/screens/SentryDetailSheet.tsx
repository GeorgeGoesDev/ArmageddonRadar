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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
      <Text className="text-sm" style={{ color: colors.textMuted }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

const TORINO_CAPTION: Record<number, string> = {
  0: 'No unusual level of danger.',
  1: 'Routine — a pass near Earth, no cause for concern.',
};

export function SentryDetailSheet({ risk, onClose }: { risk: SentryRisk | null; onClose: () => void }) {
  const { data, isLoading, isError } = useSentryDetail(risk?.designation ?? null);
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
              <Text className="text-xs" style={{ color: colors.textMuted }}>{TORINO_CAPTION[risk.torinoMax] ?? 'Elevated — merits attention by astronomers.'}</Text>
            </View>

            <Row label="Impact probability" value={`${formatOdds(risk.impactProb)} (${(risk.impactProb * 100).toExponential(1)}%)`} />
            <Row label="Potential impacts" value={`${risk.nImpacts} between ${risk.yearRange}`} />
            <Row label="Estimated diameter" value={`${formatInt(risk.estDiameterM)} m`} />
            <Row label="Palermo (cumulative)" value={risk.palermoCum.toFixed(2)} />

            {isLoading && <View className="py-6 items-center"><ActivityIndicator color={colors.accentBlue} /></View>}
            {isError && <Text className="py-6 text-center text-xs" style={{ color: colors.textMuted }}>Extended risk data unavailable.</Text>}
            {data && (
              <>
                <Row label="Palermo (max)" value={data.palermoMax.toFixed(2)} />
                <Row label="Impact energy" value={`${formatInt(data.energyMt)} MT TNT`} />
                <Row label="Mass" value={`${data.massKg.toExponential(2)} kg`} />
                <Row label="Velocity (v∞)" value={`${data.vInfKps.toFixed(1)} km/s`} />
                <Row label="First observed" value={data.firstObs} />
                <Row label="Last observed" value={data.lastObs} />
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
