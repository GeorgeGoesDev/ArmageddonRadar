import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Asteroid } from '../types/neo';
import { colors } from '../theme/colors';
import { getThreatLevel } from '../utils/threat';
import { describeDiameter } from '../data/diameterComparisons';
import { formatInt, formatKm, formatKph, formatLunar, formatMiles } from '../utils/units';
import { formatLocalDateTime, formatLocalTime } from '../utils/dates';
import { scheduleApproachReminder } from '../utils/notifications';

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

  if (!asteroid) return null;
  const threat = getThreatLevel(asteroid.missLunar);

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
          style={{ backgroundColor: colors.spaceBlack, maxHeight: '90%', borderTopWidth: 1, borderColor: colors.cardBorder }}
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
                  style={{ backgroundColor: threat.color }}
                />
                <Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {asteroid.displayName}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <MaterialCommunityIcons name="close-circle" size={28} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text className="mt-1 text-xs" style={{ color: threat.color }}>
              {asteroid.hazardous ? '⚠️ Potentially hazardous object' : '✓ Not classified as hazardous'}
            </Text>
          </LinearGradient>

          <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Orbital data */}
            <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>
              Orbital mechanics
            </Text>
            <DataRow label="Closest approach" value={asteroid.approachDateFull || formatLocalDateTime(asteroid.approachEpochMs)} />
            <DataRow label="Relative velocity" value={formatKph(asteroid.velocityKph)} />
            <DataRow label="Miss distance (lunar)" value={formatLunar(asteroid.missLunar)} />
            <DataRow label="Miss distance (miles)" value={formatMiles(asteroid.missMiles)} />
            <DataRow label="Miss distance (km)" value={formatKm(asteroid.missKm)} />
            <DataRow label="Estimated diameter" value={`${formatInt(asteroid.diameterMinM)} – ${formatInt(asteroid.diameterMaxM)} m`} />
            <DataRow label="Size, roughly" value={describeDiameter(asteroid.diameterAvgM)} />

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
    </Modal>
  );
}
