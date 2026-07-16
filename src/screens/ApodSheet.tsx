import React from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Apod } from '../types/apod';

export function ApodSheet({ apod, visible, onClose }: { apod: Apod | null; visible: boolean; onClose: () => void }) {
  if (!apod) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View className="rounded-t-3xl overflow-hidden" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '92%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-xs uppercase tracking-widest flex-1" style={{ color: colors.accentBlue }}>Astronomy Picture · {apod.date}</Text>
            <Pressable onPress={onClose} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {apod.mediaType === 'image' ? (
              <Image source={{ uri: apod.hdImageUrl || apod.imageUrl }} style={{ width: '100%', height: 260 }} contentFit="cover" transition={200} />
            ) : (
              <Pressable onPress={() => Linking.openURL(apod.siteUrl)} className="items-center justify-center" style={{ height: 160, backgroundColor: colors.charcoal }}>
                <MaterialCommunityIcons name="play-circle" size={48} color={colors.accentBlue} />
                <Text className="mt-2 text-xs" style={{ color: colors.accentBlue }}>Open today's video</Text>
              </Pressable>
            )}
            <View className="px-5">
              <Text className="mt-4 text-lg font-bold" style={{ color: colors.textPrimary }}>{apod.title}</Text>
              {!!apod.copyright && <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>© {apod.copyright}</Text>}
              <Text className="mt-3 text-sm leading-5" style={{ color: colors.textMuted }}>{apod.explanation}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
