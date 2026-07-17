import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n/LocaleContext';

const SLIDES: { id: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; titleKey: string; bodyKey: string }[] = [
  { id: 'gauge', icon: 'gauge', titleKey: 'onboarding.gaugeTitle', bodyKey: 'onboarding.gaugeBody' },
  { id: 'radar', icon: 'radar', titleKey: 'onboarding.radarTitle', bodyKey: 'onboarding.radarBody' },
  { id: 'impact', icon: 'skull-outline', titleKey: 'onboarding.impactTitle', bodyKey: 'onboarding.impactBody' },
];

export function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
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
        <Pressable onPress={onDone} hitSlop={10}><Text className="text-sm" style={{ color: colors.textMuted }}>{t('onboarding.skip')}</Text></Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s) => (
          <View key={s.id} style={{ width }} className="items-center justify-center px-8">
            <MaterialCommunityIcons name={s.icon} size={72} color={colors.accentBlue} />
            <Text className="mt-6 text-2xl font-extrabold text-center" style={{ color: colors.textPrimary }}>{t(s.titleKey)}</Text>
            <Text className="mt-3 text-center text-sm" style={{ color: colors.textMuted }}>{t(s.bodyKey)}</Text>
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
          <Text className="font-bold" style={{ color: colors.spaceBlack }}>{index < SLIDES.length - 1 ? t('onboarding.next') : t('onboarding.getStarted')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
