import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asteroid } from '../types/neo';
import { colors } from '../theme/colors';
import { describeDiameter } from '../data/diameterComparisons';
import { useFormatters } from '../settings/useFormatters';
import { asteroidColor } from '../utils/asteroidColor';
import { useWatchlist } from '../watchlist/WatchlistContext';
import { useSettings } from '../settings/SettingsContext';
import { hapticSuccess } from '../utils/haptics';
import { useTranslation } from '../i18n/LocaleContext';

interface AsteroidCardProps {
  asteroid: Asteroid;
  selected: boolean;
  onPress: () => void;
  onDetails: () => void;
}

interface MetricProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  highlight: boolean;
}

function Metric({ icon, label, value, highlight }: MetricProps) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center mb-0.5">
        <MaterialCommunityIcons
          name={icon}
          size={13}
          color={highlight ? colors.threatOrange : colors.textMuted}
        />
        <Text
          className="ml-1 text-[10px] uppercase tracking-wider"
          style={{ color: highlight ? colors.threatOrange : colors.textMuted }}
        >
          {label}
        </Text>
      </View>
      <Text className="text-ink text-sm font-semibold" style={{ color: colors.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * A tracking card for a single asteroid. Selecting it focuses the radar and
 * highlights its key metrics; the chevron opens the detail sheet.
 */
export function AsteroidCard({ asteroid, selected, onPress, onDetails }: AsteroidCardProps) {
  const fmt = useFormatters();
  const { t } = useTranslation();
  const { isWatched, toggle } = useWatchlist();
  const { settings } = useSettings();
  const watched = isWatched(asteroid.id);
  const onStar = () => {
    if (!watched) hapticSuccess(settings.hapticsEnabled);
    toggle(asteroid.id);
  };
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: colors.spaceSlate,
        borderWidth: 1.5,
        borderColor: selected ? colors.threatOrange : colors.cardBorder,
      }}
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-shrink" style={{ flex: 1 }}>
          <View
            className="h-2.5 w-2.5 rounded-full mr-2"
            style={{
              backgroundColor: asteroidColor(asteroid.id),
              shadowColor: asteroidColor(asteroid.id),
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <Text
            className="text-base font-bold"
            style={{ color: colors.textPrimary }}
            numberOfLines={1}
          >
            {asteroid.displayName}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Pressable onPress={onStar} hitSlop={10} className="mr-2">
            <MaterialCommunityIcons name={watched ? 'star' : 'star-outline'} size={20} color={watched ? colors.threatYellow : colors.textMuted} />
          </Pressable>
          <Pressable onPress={onDetails} hitSlop={10} className="flex-row items-center">
            {asteroid.hazardous && (
              <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: 'rgba(255,69,0,0.15)' }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.threatOrange }}>{t('card.hazardous')}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accentBlue} />
          </Pressable>
        </View>
      </View>

      {/* Metrics */}
      <View className="flex-row">
        <Metric icon="speedometer" label={t('card.velocity')} value={fmt.velocity(asteroid.velocityKph)} highlight={selected} />
        <Metric icon="arrow-expand-horizontal" label={t('card.diameter')} value={fmt.diameterRange(asteroid.diameterMinM, asteroid.diameterMaxM)} highlight={selected} />
      </View>
      <View className="flex-row mt-3">
        <Metric icon="moon-waning-crescent" label={t('card.miss')} value={fmt.distanceFromLunar(asteroid.missLunar, asteroid.missKm, asteroid.missMiles)} highlight={selected} />
        <Metric icon="earth" label={t('card.approach')} value={new Date(asteroid.approachEpochMs).toLocaleDateString([], { day: '2-digit', month: 'short' })} highlight={selected} />
      </View>

      {/* Fun size comparison */}
      <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: colors.gridLineFaint }}>
        <Text className="text-xs" style={{ color: colors.accentBlue }}>
          {describeDiameter(asteroid.diameterAvgM)}
        </Text>
      </View>
    </Pressable>
  );
}
