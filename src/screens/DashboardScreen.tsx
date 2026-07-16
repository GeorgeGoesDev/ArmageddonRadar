import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNeoWeek } from '../hooks/useNeoWeek';
import { Asteroid } from '../types/neo';
import { colors } from '../theme/colors';
import { getLocalDateKey } from '../utils/dates';
import { ThreatGauge } from '../components/ThreatGauge';
import { VerdictBanner } from '../components/VerdictBanner';
import { RadarView } from '../components/RadarView';
import { AsteroidCard } from '../components/AsteroidCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { DaySelector } from '../components/DaySelector';
import { ListControlsBar } from '../components/ListControlsBar';
import { DetailSheet } from './DetailSheet';
import { WeekSheet } from './WeekSheet';
import { SettingsSheet } from './SettingsSheet';
import { WatchlistSheet } from './WatchlistSheet';
import { ApodBanner } from '../components/ApodBanner';
import { ImpactRiskSheet } from './ImpactRiskSheet';
import { SentryDetailSheet } from './SentryDetailSheet';
import { SentryRisk } from '../types/sentry';
import { applyListControls, DEFAULT_CONTROLS, ListControls } from '../utils/listControls';
import { useSettings } from '../settings/SettingsContext';
import { useThresholds } from '../settings/useFormatters';
import { getThreatLevel } from '../utils/threat';
import { hapticWarning } from '../utils/haptics';

function Header({ onWatchlist, onWeek, onSettings, onRisk }: { onWatchlist: () => void; onWeek: () => void; onSettings: () => void; onRisk: () => void }) {
  return (
    <View className="px-4 pt-2 pb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons name="radar" size={24} color={colors.accentBlue} />
          <Text className="ml-2 text-xl font-extrabold tracking-widest" style={{ color: colors.textPrimary }}>ARMAGEDDON RADAR</Text>
        </View>
        <Pressable onPress={onWatchlist} hitSlop={8} className="ml-2"><MaterialCommunityIcons name="star" size={22} color={colors.threatYellow} /></Pressable>
        <Pressable onPress={onRisk} hitSlop={8} className="ml-2"><MaterialCommunityIcons name="skull-outline" size={22} color={colors.threatOrange} /></Pressable>
        <Pressable onPress={onWeek} hitSlop={8} className="ml-2"><MaterialCommunityIcons name="calendar-week" size={22} color={colors.accentBlue} /></Pressable>
        <Pressable onPress={onSettings} hitSlop={8} className="ml-4"><MaterialCommunityIcons name="cog" size={22} color={colors.accentBlue} /></Pressable>
      </View>
      <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>Your daily check on how close humanity is to a surprise cosmic punch.</Text>
    </View>
  );
}

function ErrorState({ message, onRetry, onDemo }: { message: string; onRetry: () => void; onDemo: () => void }) {
  return (
    <View className="px-4 py-10 items-center">
      <MaterialCommunityIcons name="satellite-variant" size={48} color={colors.threatOrange} />
      <Text className="mt-4 text-center text-base font-semibold" style={{ color: colors.textPrimary }}>Lost contact with NASA</Text>
      <Text className="mt-2 text-center text-xs" style={{ color: colors.textMuted }}>{message}</Text>
      <View className="flex-row mt-5">
        <Pressable onPress={onRetry} className="rounded-xl px-5 py-3 mr-3" style={{ backgroundColor: colors.accentBlue }}><Text className="font-bold" style={{ color: colors.spaceBlack }}>Retry</Text></Pressable>
        <Pressable onPress={onDemo} className="rounded-xl px-5 py-3" style={{ borderWidth: 1.5, borderColor: colors.accentBlue }}><Text className="font-bold" style={{ color: colors.accentBlue }}>Use demo data</Text></Pressable>
      </View>
    </View>
  );
}

export function DashboardScreen() {
  const [useMock, setUseMock] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controls, setControls] = useState<ListControls>(DEFAULT_CONTROLS);
  const [detailAsteroid, setDetailAsteroid] = useState<Asteroid | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [weekVisible, setWeekVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [riskVisible, setRiskVisible] = useState(false);
  const [watchlistVisible, setWatchlistVisible] = useState(false);
  const [sentryRisk, setSentryRisk] = useState<SentryRisk | null>(null);

  const { data: week, isLoading, isError, error, refetch, isRefetching } = useNeoWeek({ useMock });

  const dayList = useMemo<Asteroid[]>(() => (week ? week[selectedDateKey] ?? [] : []), [week, selectedDateKey]);
  const visibleList = useMemo(() => applyListControls(dayList, controls), [dayList, controls]);
  const closest = useMemo(() => (dayList.length ? dayList.reduce((a, b) => (a.missLunar <= b.missLunar ? a : b)) : null), [dayList]);

  const { settings } = useSettings();
  const thresholds = useThresholds();
  const buzzedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!closest) return;
    const danger = closest.hazardous || getThreatLevel(closest.missLunar, thresholds).zone === 'danger';
    if (danger && buzzedFor.current !== selectedDateKey) {
      buzzedFor.current = selectedDateKey;
      hapticWarning(settings.hapticsEnabled);
    }
  }, [closest, selectedDateKey, thresholds, settings.hapticsEnabled]);

  const effectiveSelectedId = selectedId ?? closest?.id ?? null;

  const openDetails = (a: Asteroid) => { setSelectedId(a.id); setDetailAsteroid(a); setDetailVisible(true); };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.spaceBlack }} edges={['top']}>
      <StatusBar style="light" />
      <ApodBanner />
      <Header onWatchlist={() => setWatchlistVisible(true)} onWeek={() => setWeekVisible(true)} onSettings={() => setSettingsVisible(true)} onRisk={() => setRiskVisible(true)} />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message={error?.message ?? 'Unknown error.'} onRetry={() => refetch()} onDemo={() => setUseMock(true)} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accentBlue} />}>
          {week && (
            <View className="mb-1">
              <DaySelector week={week} selectedDateKey={selectedDateKey} onSelect={(k) => { setSelectedDateKey(k); setSelectedId(null); }} />
            </View>
          )}

          {closest ? (
            <>
              <View className="items-center mt-2"><ThreatGauge lunar={closest.missLunar} /></View>
              <View className="px-4 mt-3"><VerdictBanner lunar={closest.missLunar} /></View>

              <Text className="px-4 mt-7 mb-2 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Live radar · tap a blip</Text>
              <View className="items-center"><RadarView asteroids={dayList} selectedId={effectiveSelectedId} onSelect={setSelectedId} /></View>

              <View className="flex-row items-center justify-between px-4 mt-7 mb-2">
                <Text className="text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Active tracking · {visibleList.length}</Text>
                {useMock && <Text className="text-[10px]" style={{ color: colors.textMuted }}>demo data</Text>}
              </View>
              <View className="mb-2"><ListControlsBar controls={controls} onChange={setControls} /></View>

              <View className="px-4 mt-2">
                {visibleList.length === 0 ? (
                  <Text className="text-center text-xs py-8" style={{ color: colors.textMuted }}>No asteroids match your filters.</Text>
                ) : (
                  visibleList.map((a) => (
                    <AsteroidCard key={a.id} asteroid={a} selected={a.id === effectiveSelectedId} onPress={() => setSelectedId(a.id)} onDetails={() => openDetails(a)} />
                  ))
                )}
              </View>
            </>
          ) : (
            <View className="px-4 py-16 items-center">
              <MaterialCommunityIcons name="shield-check" size={56} color={colors.safeGreen} />
              <Text className="mt-4 text-lg font-bold" style={{ color: colors.textPrimary }}>Clear skies</Text>
              <Text className="mt-2 text-center text-xs" style={{ color: colors.textMuted }}>No near-Earth objects tracked for this day. Enjoy the calm.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <DetailSheet asteroid={detailAsteroid} visible={detailVisible} onClose={() => setDetailVisible(false)} />
      {week && <WeekSheet visible={weekVisible} week={week} onClose={() => setWeekVisible(false)} onSelectDay={(k) => { setSelectedDateKey(k); setSelectedId(null); }} />}
      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <WatchlistSheet visible={watchlistVisible} week={week} onClose={() => setWatchlistVisible(false)} onOpen={(a) => { setWatchlistVisible(false); openDetails(a); }} />
      <ImpactRiskSheet visible={riskVisible} onClose={() => setRiskVisible(false)} onSelect={(r) => setSentryRisk(r)} />
      <SentryDetailSheet risk={sentryRisk} onClose={() => setSentryRisk(null)} />
    </SafeAreaView>
  );
}
