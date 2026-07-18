import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NeoWeek } from '../api/nasa';
import { colors } from '../theme/colors';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { useTranslation, TFunc } from '../i18n/LocaleContext';

interface Props {
  week: NeoWeek;
  selectedDateKey: string;
  onSelect: (key: string) => void;
}

function closestLunar(list: NeoWeek[string]): number | null {
  if (!list || list.length === 0) return null;
  return list.reduce((m, a) => Math.min(m, a.missLunar), Infinity);
}

function weekdayLabel(key: string, t: TFunc): string {
  const [y, m, d] = key.split('-').map(Number);
  return t('dates.wd' + new Date(y, m - 1, d).getDay());
}

export function DaySelector({ week, selectedDateKey, onSelect }: Props) {
  const thresholds = useThresholds();
  const { t } = useTranslation();
  const keys = Object.keys(week);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {keys.map((key) => {
        const closest = closestLunar(week[key]);
        const selected = key === selectedDateKey;
        const zoneColor = closest === null ? colors.textMuted : getThreatLevel(closest, thresholds).color;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            className="rounded-2xl px-3 py-2 items-center"
            style={{
              backgroundColor: selected ? colors.spaceSlate : colors.charcoal,
              borderWidth: 1.5,
              borderColor: selected ? zoneColor : colors.gridLineFaint,
              minWidth: 60,
            }}
          >
            <Text className="text-[11px] uppercase" style={{ color: colors.textMuted }}>
              {weekdayLabel(key, t)}
            </Text>
            <View className="h-1.5 w-1.5 rounded-full my-1" style={{ backgroundColor: zoneColor }} />
            <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
              {closest === null ? '—' : `${closest.toFixed(1)}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
