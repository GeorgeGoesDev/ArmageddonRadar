import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useApod } from '../hooks/useApod';
import { ApodSheet } from '../screens/ApodSheet';

export function ApodBanner() {
  const { data } = useApod();
  const [open, setOpen] = useState(false);
  if (!data) return null; // loading/error → render nothing (no layout jump)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="mx-4 mt-2 rounded-2xl overflow-hidden" style={{ height: 132, backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.cardBorder }}>
        {data.mediaType === 'image' ? (
          <Image source={{ uri: data.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <MaterialCommunityIcons name="play-circle" size={32} color={colors.accentBlue} />
            <Text className="mt-1 text-[11px]" style={{ color: colors.accentBlue }}>Today's APOD is a video</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(11,12,16,0.9)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text className="text-[10px] uppercase tracking-widest" style={{ color: colors.accentBlue }}>Astronomy Picture of the Day</Text>
          <Text className="text-sm font-bold" style={{ color: colors.textPrimary }} numberOfLines={1}>{data.title}</Text>
        </LinearGradient>
      </Pressable>
      <ApodSheet apod={data} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
