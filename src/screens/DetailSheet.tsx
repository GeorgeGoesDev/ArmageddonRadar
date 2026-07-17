import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Asteroid } from '../types/neo';
import { colors } from '../theme/colors';
import { getThreatLevel } from '../utils/threat';
import { asteroidColor } from '../utils/asteroidColor';
import { describeDiameter } from '../data/diameterComparisons';
import { formatInt, KM_TO_MILES } from '../utils/units';
import { formatLocalDateTime, formatLocalTime } from '../utils/dates';
import { isExpoGo, scheduleApproachReminder } from '../utils/notifications';
import { useFormatters, useThresholds } from '../settings/useFormatters';
import { useNeoDetail } from '../hooks/useNeoDetail';
import { ApproachTimeline } from '../components/ApproachTimeline';
import { ImpactReportSheet } from './ImpactReportSheet';
import { hapticWarning, hapticSuccess } from '../utils/haptics';
import { useSettings } from '../settings/SettingsContext';
import { useWatchlist } from '../watchlist/WatchlistContext';

interface DetailSheetProps {
  asteroid: Asteroid | null;
  visible: boolean;
  onClose: () => void;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-row justify-between py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}
    >
      <Text className="text-sm" style={{ color: colors.textMuted }}>{label}</Text>
      <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

type ReminderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; message: string }
  | { status: 'error'; message: string };

/**
 * Full-screen modal detail sheet: orbital-mechanics breakdown, a simulated
 * "Set Telescope Reminder" that schedules a local notification for the closest
 * approach, and a cheeky share widget.
 */
export function DetailSheet({ asteroid, visible, onClose }: DetailSheetProps) {
  const [reminder, setReminder] = useState<ReminderState>({ status: 'idle' });
  const fmt = useFormatters();
  const thresholds = useThresholds();
  const { width } = useWindowDimensions();
  const detail = useNeoDetail(asteroid?.id ?? null);
  const { settings } = useSettings();
  const { isWatched, toggle } = useWatchlist();
  const [simVisible, setSimVisible] = useState(false);

  useEffect(() => {
    if (visible && asteroid?.hazardous) hapticWarning(settings.hapticsEnabled);
  }, [visible, asteroid?.id, asteroid?.hazardous, settings.hapticsEnabled]);

  if (!asteroid) return null;
  const threat = getThreatLevel(asteroid.missLunar, thresholds);

  const handleReminder = async () => {
    setReminder({ status: 'loading' });
    try {
      const res = await scheduleApproachReminder(asteroid);
      setReminder({
        status: 'done',
        message: res.adjusted
          ? `Approach already passed today — demo reminder set for ${formatLocalTime(res.fireDate.getTime())}.`
          : `Reminder set for ${formatLocalDateTime(res.fireDate.getTime())}.`,
      });
      hapticSuccess(settings.hapticsEnabled);
    } catch (e) {
      setReminder({
        status: 'error',
        message: e instanceof Error ? e.message : 'Could not set reminder.',
      });
    }
  };

  const handleShare = async () => {
    const message =
      `☄️ Asteroid ${asteroid.displayName} is passing within ${formatInt(asteroid.missMiles)} miles of Earth today ` +
      `at ${formatInt(asteroid.velocityKph)} KPH. Verdict: ${threat.shortVerdict}! ` +
      `— tracked with Armageddon Radar`;
    try {
      await Share.share({ message });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View
          className="rounded-t-3xl overflow-hidden"
          style={{ backgroundColor: colors.spaceBlack, height: '90%', borderTopWidth: 1, borderColor: colors.cardBorder }}
        >
          {/* Header */}
          <LinearGradient
            colors={[colors.spaceSlate, colors.spaceBlack]}
            style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
          >
            <View className="items-center mb-2">
              <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.textMuted }} />
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="h-3 w-3 rounded-full mr-2"
                  style={{ backgroundColor: asteroidColor(asteroid.id) }}
                />
                <Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {asteroid.displayName}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => {
                    if (!isWatched(asteroid.id)) hapticSuccess(settings.hapticsEnabled);
                    toggle(asteroid.id);
                  }}
                  hitSlop={12}
                  className="mr-3"
                >
                  <MaterialCommunityIcons
                    name={isWatched(asteroid.id) ? 'star' : 'star-outline'}
                    size={26}
                    color={isWatched(asteroid.id) ? colors.threatYellow : colors.textMuted}
                  />
                </Pressable>
                <Pressable onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close-circle" size={28} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>
            <Text className="mt-1 text-xs" style={{ color: threat.color }}>
              {asteroid.hazardous ? '⚠️ Potentially hazardous object' : '✓ Not classified as hazardous'}
            </Text>
          </LinearGradient>

          <ScrollView className="px-5" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Orbital data */}
            <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>
              Orbital mechanics
            </Text>
            <DataRow label="Closest approach" value={asteroid.approachDateFull || formatLocalDateTime(asteroid.approachEpochMs)} />
            <DataRow label="Relative velocity" value={fmt.velocity(asteroid.velocityKph)} />
            <DataRow label="Miss distance" value={fmt.distanceFromLunar(asteroid.missLunar, asteroid.missKm, asteroid.missMiles)} />
            <DataRow label="Estimated diameter" value={`${formatInt(asteroid.diameterMinM)} – ${formatInt(asteroid.diameterMaxM)} m`} />
            <DataRow label="Size, roughly" value={describeDiameter(asteroid.diameterAvgM)} />

            {/* Extended detail from /neo/{id} */}
            {detail.isLoading && (
              <View className="py-4 items-center"><ActivityIndicator color={colors.accentBlue} /></View>
            )}
            {detail.isError && (
              <Text className="py-4 text-center text-xs" style={{ color: colors.textMuted }}>
                Extended orbital data unavailable.
              </Text>
            )}
            {detail.data && (
              <>
                <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Orbital elements</Text>
                <DataRow label="Semi-major axis" value={`${detail.data.orbital.semiMajorAxisAu.toFixed(3)} AU`} />
                <DataRow label="Eccentricity" value={detail.data.orbital.eccentricity.toFixed(3)} />
                <DataRow label="Inclination" value={`${detail.data.orbital.inclinationDeg.toFixed(1)}°`} />
                <DataRow label="Orbital period" value={`${fmt.int(detail.data.orbital.orbitalPeriodDays)} days`} />
                <DataRow label="Perihelion / aphelion" value={`${detail.data.orbital.perihelionAu.toFixed(2)} / ${detail.data.orbital.aphelionAu.toFixed(2)} AU`} />
                <DataRow label="Orbit class" value={detail.data.orbital.orbitClassType} />

                {detail.data.approaches.length > 0 && (
                  <>
                    <Text className="mt-6 mb-2 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Approach timeline</Text>
                    <ApproachTimeline approaches={detail.data.approaches} width={width - 40} />
                    <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Close-approach history</Text>
                    {detail.data.approaches.slice(0, 20).map((a, i) => (
                      <View key={i} className="flex-row justify-between py-2" style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}>
                        <Text className="text-xs" style={{ color: colors.textMuted }}>{a.dateFull}</Text>
                        <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>{fmt.distanceFromLunar(a.missLunar, a.missKm, a.missKm * KM_TO_MILES)}</Text>
                      </View>
                    ))}
                  </>
                )}

                <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>More</Text>
                <DataRow label="Orbit class detail" value={detail.data.orbital.orbitClassDescription} />
                <DataRow label="First / last observed" value={`${detail.data.orbital.firstObservation} → ${detail.data.orbital.lastObservation}`} />
                <DataRow label="Absolute magnitude (H)" value={detail.data.absoluteMagnitude.toFixed(1)} />
              </>
            )}

            {/* Reminder */}
            <Pressable
              onPress={handleReminder}
              disabled={reminder.status === 'loading'}
              className="mt-6 rounded-2xl px-4 py-4 flex-row items-center justify-center"
              style={{ backgroundColor: colors.accentPurple }}
            >
              {reminder.status === 'loading' ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="telescope" size={20} color={colors.textPrimary} />
                  <Text className="ml-2 text-base font-bold" style={{ color: colors.textPrimary }}>
                    Set Telescope Reminder
                  </Text>
                </>
              )}
            </Pressable>
            {(reminder.status === 'done' || reminder.status === 'error') && (
              <Text
                className="mt-2 text-center text-xs"
                style={{ color: reminder.status === 'error' ? colors.threatOrange : colors.safeGreen }}
              >
                {reminder.message}
              </Text>
            )}
            {isExpoGo && reminder.status === 'idle' && (
              <Text className="mt-2 text-center text-[11px]" style={{ color: colors.textMuted }}>
                Note: in Expo Go this is a preview — reminders fire in a development build.
              </Text>
            )}

            {/* Simulate impact */}
            <Pressable
              onPress={() => setSimVisible(true)}
              className="mt-3 rounded-2xl px-4 py-4 flex-row items-center justify-center"
              style={{ backgroundColor: colors.threatOrange }}
            >
              <MaterialCommunityIcons name="bomb" size={20} color={colors.spaceBlack} />
              <Text className="ml-2 text-base font-bold" style={{ color: colors.spaceBlack }}>💥 Simulate impact</Text>
            </Pressable>

            {/* Share */}
            <Pressable
              onPress={handleShare}
              className="mt-3 rounded-2xl px-4 py-4 flex-row items-center justify-center"
              style={{ borderWidth: 1.5, borderColor: colors.accentBlue }}
            >
              <MaterialCommunityIcons name="share-variant" size={20} color={colors.accentBlue} />
              <Text className="ml-2 text-base font-bold" style={{ color: colors.accentBlue }}>
                Share the cosmic gossip
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
      <ImpactReportSheet asteroid={asteroid} visible={simVisible} onClose={() => setSimVisible(false)} />
    </Modal>
  );
}
