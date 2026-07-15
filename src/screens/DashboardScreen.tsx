import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNeoFeed } from '../hooks/useNeoFeed';
import { Asteroid } from '../types/neo';
import { colors } from '../theme/colors';
import { ThreatGauge } from '../components/ThreatGauge';
import { VerdictBanner } from '../components/VerdictBanner';
import { RadarView } from '../components/RadarView';
import { AsteroidCard } from '../components/AsteroidCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { DetailSheet } from './DetailSheet';

function Header() {
  return (
    <View className="px-4 pt-2 pb-4">
      <View className="flex-row items-center">
        <MaterialCommunityIcons name="radar" size={26} color={colors.accentBlue} />
        <Text
          className="ml-2 text-2xl font-extrabold tracking-widest"
          style={{ color: colors.textPrimary }}
        >
          ARMAGEDDON RADAR
        </Text>
      </View>
      <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>
        Your daily check on how close humanity is to a surprise cosmic punch.
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry, onDemo }: { message: string; onRetry: () => void; onDemo: () => void }) {
  return (
    <View className="px-4 py-10 items-center">
      <MaterialCommunityIcons name="satellite-variant" size={48} color={colors.threatOrange} />
      <Text className="mt-4 text-center text-base font-semibold" style={{ color: colors.textPrimary }}>
        Lost contact with NASA
      </Text>
      <Text className="mt-2 text-center text-xs" style={{ color: colors.textMuted }}>
        {message}
      </Text>
      <View className="flex-row mt-5">
        <Pressable onPress={onRetry} className="rounded-xl px-5 py-3 mr-3" style={{ backgroundColor: colors.accentBlue }}>
          <Text className="font-bold" style={{ color: colors.spaceBlack }}>Retry</Text>
        </Pressable>
        <Pressable onPress={onDemo} className="rounded-xl px-5 py-3" style={{ borderWidth: 1.5, borderColor: colors.accentBlue }}>
          <Text className="font-bold" style={{ color: colors.accentBlue }}>Use demo data</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DashboardScreen() {
  const [useMock, setUseMock] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailAsteroid, setDetailAsteroid] = useState<Asteroid | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useNeoFeed({ useMock });

  const asteroids = data ?? [];
  const closest = useMemo(
    () => (asteroids.length ? asteroids.reduce((a, b) => (a.missLunar <= b.missLunar ? a : b)) : null),
    [asteroids],
  );

  // Default selection to the closest object once data lands.
  const effectiveSelectedId = selectedId ?? closest?.id ?? null;

  const openDetails = (asteroid: Asteroid) => {
    setSelectedId(asteroid.id);
    setDetailAsteroid(asteroid);
    setDetailVisible(true);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.spaceBlack }} edges={['top']}>
      <StatusBar style="light" />
      <Header />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState
          message={error?.message ?? 'Unknown error.'}
          onRetry={() => refetch()}
          onDemo={() => setUseMock(true)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accentBlue} />
          }
        >
          {closest ? (
            <>
              {/* Threat gauge */}
              <View className="items-center mt-2">
                <ThreatGauge lunar={closest.missLunar} />
              </View>
              <View className="px-4 mt-3">
                <VerdictBanner lunar={closest.missLunar} />
              </View>

              {/* Radar */}
              <Text className="px-4 mt-7 mb-2 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>
                Live radar · tap a blip
              </Text>
              <View className="items-center">
                <RadarView
                  asteroids={asteroids}
                  selectedId={effectiveSelectedId}
                  onSelect={setSelectedId}
                />
              </View>

              {/* Tracking list */}
              <View className="flex-row items-center justify-between px-4 mt-7 mb-2">
                <Text className="text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>
                  Active tracking · {asteroids.length}
                </Text>
                {useMock && (
                  <Text className="text-[10px]" style={{ color: colors.textMuted }}>demo data</Text>
                )}
              </View>
              <View className="px-4">
                {asteroids.map((a) => (
                  <AsteroidCard
                    key={a.id}
                    asteroid={a}
                    selected={a.id === effectiveSelectedId}
                    onPress={() => setSelectedId(a.id)}
                    onDetails={() => openDetails(a)}
                  />
                ))}
              </View>
            </>
          ) : (
            <View className="px-4 py-16 items-center">
              <MaterialCommunityIcons name="shield-check" size={56} color={colors.safeGreen} />
              <Text className="mt-4 text-lg font-bold" style={{ color: colors.textPrimary }}>
                Clear skies today
              </Text>
              <Text className="mt-2 text-center text-xs" style={{ color: colors.textMuted }}>
                NASA isn't tracking any near-Earth objects for today. Enjoy the calm.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <DetailSheet
        asteroid={detailAsteroid}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
}
