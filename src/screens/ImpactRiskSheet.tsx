import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSentryRisks } from '../hooks/useSentryRisks';
import { SentryRisk } from '../types/sentry';
import { TorinoChip } from '../components/TorinoChip';
import { formatOdds } from '../utils/torino';

export function ImpactRiskSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (risk: SentryRisk) => void }) {
  const { data, isLoading, isError, error, refetch } = useSentryRisks();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, height: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>☠️ Impact Risk</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text className="px-5 pb-2 text-xs" style={{ color: colors.textMuted }}>
            NASA/JPL Sentry risk list · highest impact probability first
          </Text>

          {isLoading ? (
            <View className="py-16 items-center"><ActivityIndicator color={colors.accentBlue} /></View>
          ) : isError ? (
            <View className="py-12 items-center px-5">
              <Text className="text-center text-xs mb-4" style={{ color: colors.textMuted }}>{error?.message ?? 'Failed to load.'}</Text>
              <Pressable onPress={() => refetch()} className="rounded-xl px-5 py-3" style={{ backgroundColor: colors.accentBlue }}>
                <Text className="font-bold" style={{ color: colors.spaceBlack }}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView className="px-5" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
              {(data ?? []).map((risk, i) => (
                <Pressable key={risk.designation} onPress={() => onSelect(risk)} className="flex-row items-center py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
                  <Text className="text-xs w-6" style={{ color: colors.textMuted }}>{i + 1}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>{risk.name}</Text>
                    <Text className="text-[11px]" style={{ color: colors.accentBlue }}>{formatOdds(risk.impactProb)} · {Math.round(risk.estDiameterM)} m</Text>
                  </View>
                  <TorinoChip level={risk.torinoMax} />
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
