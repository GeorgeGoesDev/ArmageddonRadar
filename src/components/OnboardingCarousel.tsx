import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SLIDES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string }[] = [
  { icon: 'gauge', title: 'The Threat Gauge', body: "The needle tracks today's closest asteroid in lunar distances — under 1 is red-alert close, over 5 is all clear." },
  { icon: 'radar', title: 'The Live Radar', body: 'Every blip is a near-Earth object today. Tap one to focus it and see its speed, size, and miss distance.' },
  { icon: 'skull-outline', title: 'Impact Reports', body: 'Open any asteroid and hit "Simulate impact" to see energy, craters, and a shareable doomsday card.' },
];

export function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };
  const next = () => (index < SLIDES.length - 1 ? go(index + 1) : onDone());

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.spaceBlack }}>
      <View className="flex-row justify-end px-5 pt-2">
        <Pressable onPress={onDone} hitSlop={10}><Text className="text-sm" style={{ color: colors.textMuted }}>Skip</Text></Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={{ width }} className="items-center justify-center px-8">
            <MaterialCommunityIcons name={s.icon} size={72} color={colors.accentBlue} />
            <Text className="mt-6 text-2xl font-extrabold text-center" style={{ color: colors.textPrimary }}>{s.title}</Text>
            <Text className="mt-3 text-center text-sm" style={{ color: colors.textMuted }}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center justify-between px-8 pb-6">
        <View className="flex-row" style={{ gap: 6 }}>
          {SLIDES.map((_, i) => (
            <View key={i} className="h-2 rounded-full" style={{ width: i === index ? 18 : 8, backgroundColor: i === index ? colors.accentBlue : colors.spaceSlate }} />
          ))}
        </View>
        <Pressable onPress={next} className="rounded-2xl px-6 py-3" style={{ backgroundColor: colors.accentBlue }}>
          <Text className="font-bold" style={{ color: colors.spaceBlack }}>{index < SLIDES.length - 1 ? 'Next' : 'Get started'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
