import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NeoWeek } from '../api/nasa';
import { colors } from '../theme/colors';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { useTranslation } from '../i18n/LocaleContext';

const MAX_BAR_LD = 15;

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: '2-digit' });
}

export function WeekSheet({ visible, week, onClose, onSelectDay }: { visible: boolean; week: NeoWeek; onClose: () => void; onSelectDay: (key: string) => void }) {
  const thresholds = useThresholds();
  const { t } = useTranslation();
  const keys = Object.keys(week);

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '85%' }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>{t('week.title')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          {keys.map((key) => {
            const list = week[key];
            const closest = list.length ? list.reduce((m, a) => Math.min(m, a.missLunar), Infinity) : null;
            const hazardous = list.some((a) => a.hazardous);
            const zoneColor = closest === null ? colors.textMuted : getThreatLevel(closest, thresholds).color;
            const pct = closest === null ? 0 : Math.max(6, 100 - Math.min(100, (closest / MAX_BAR_LD) * 100));
            return (
              <Pressable key={key} onPress={() => { onSelectDay(key); onClose(); }} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs" style={{ color: colors.textPrimary }}>
                    {dayLabel(key)} {hazardous ? '⚠️' : ''}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {closest === null ? t('week.clear') : `${closest.toFixed(1)} LD`}
                  </Text>
                </View>
                <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.charcoal }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: zoneColor, borderRadius: 999 }} />
                </View>
              </Pressable>
            );
          })}
          <SafeAreaView edges={['bottom']} />
        </View>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}
