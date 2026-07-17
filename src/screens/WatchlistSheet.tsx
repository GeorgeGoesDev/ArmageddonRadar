import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Asteroid } from '../types/neo';
import { NeoWeek } from '../api/nasa';
import { useWatchlist } from '../watchlist/WatchlistContext';
import { useNeoDetail } from '../hooks/useNeoDetail';
import { AsteroidCard } from '../components/AsteroidCard';

function cleanName(name: string): string {
  return name.replace(/^\(|\)$/g, '').trim();
}

/** A row for a starred object that is NOT in the current 7-day feed. */
function RemoteRow({ id }: { id: string }) {
  const { data, isLoading } = useNeoDetail(id);
  const { toggle } = useWatchlist();
  const name = data ? cleanName(data.name) : id;
  const next = data
    ? data.approaches
        .filter((a) => a.orbitingBody === 'Earth' && a.epochMs > Date.now())
        .sort((a, b) => a.epochMs - b.epochMs)[0]
    : undefined;
  const subtitle = isLoading
    ? 'Loading…'
    : next
      ? `Next approach ${new Date(next.epochMs).toLocaleDateString([], { day: '2-digit', month: 'short' })} · ${next.missLunar.toFixed(1)} LD`
      : 'Not currently approaching';

  return (
    <View className="rounded-2xl p-4 mb-3 flex-row items-center justify-between" style={{ backgroundColor: colors.spaceSlate, borderWidth: 1.5, borderColor: colors.cardBorder }}>
      <View className="flex-1 mr-2">
        <Text className="text-base font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>{name}</Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>
      </View>
      <Pressable onPress={() => toggle(id)} hitSlop={10}>
        <MaterialCommunityIcons name="star" size={22} color={colors.threatYellow} />
      </Pressable>
    </View>
  );
}

export function WatchlistSheet({
  visible,
  week,
  onClose,
  onOpen,
}: {
  visible: boolean;
  week: NeoWeek | undefined;
  onClose: () => void;
  onOpen: (a: Asteroid) => void;
}) {
  const { ids } = useWatchlist();
  const byId = useMemo(() => {
    const m = new Map<string, Asteroid>();
    if (week) for (const list of Object.values(week)) for (const a of list) if (!m.has(a.id)) m.set(a.id, a);
    return m;
  }, [week]);

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, height: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>★ Watchlist</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView className="px-5" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            {ids.length === 0 ? (
              <View className="py-16 items-center">
                <MaterialCommunityIcons name="star-outline" size={48} color={colors.textMuted} />
                <Text className="mt-3 text-center text-sm" style={{ color: colors.textMuted }}>No starred asteroids yet.</Text>
                <Text className="mt-1 text-center text-xs" style={{ color: colors.textMuted }}>Tap the ★ on any asteroid to track it here.</Text>
              </View>
            ) : (
              ids.map((id) => {
                const inFeed = byId.get(id);
                return inFeed ? (
                  <AsteroidCard key={id} asteroid={inFeed} selected={false} onPress={() => onOpen(inFeed)} onDetails={() => onOpen(inFeed)} />
                ) : (
                  <RemoteRow key={id} id={id} />
                );
              })
            )}
          </ScrollView>
          </SafeAreaView>
        </View>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}
