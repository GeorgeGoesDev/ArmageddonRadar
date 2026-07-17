import React from 'react';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { colors } from '../theme/colors';
import { ListControls } from '../utils/listControls';
import { useTranslation } from '../i18n/LocaleContext';

interface Props {
  visible: boolean;
  controls: ListControls;
  onChange: (c: ListControls) => void;
  onClose: () => void;
}

const MAX_LUNAR_CAP = 20;

export function FilterSheet({ visible, controls, onChange, onClose }: Props) {
  const { t } = useTranslation();
  const distanceValue = Number.isFinite(controls.maxLunar) ? controls.maxLunar : MAX_LUNAR_CAP;
  const withinValue = distanceValue >= MAX_LUNAR_CAP ? t('controls.anyDistance') : `${distanceValue.toFixed(1)} LD`;
  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl px-5 pt-4 pb-8"
          style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder }}
        >
          <View className="items-center mb-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.textMuted }} />
          </View>
          <Text className="text-lg font-bold mb-4" style={{ color: colors.textPrimary }}>{t('controls.filters')}</Text>

          <View className="flex-row items-center justify-between mb-5">
            <Text style={{ color: colors.textPrimary }}>{t('controls.hazardousOnly')}</Text>
            <Switch
              value={controls.hazardousOnly}
              onValueChange={(v) => onChange({ ...controls, hazardousOnly: v })}
              trackColor={{ true: colors.threatOrange, false: colors.spaceSlate }}
            />
          </View>

          <Text className="mb-1" style={{ color: colors.textMuted }}>
            {t('controls.minDiameter', { value: controls.minDiameterM })}
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={500}
            step={10}
            value={controls.minDiameterM}
            onValueChange={(v) => onChange({ ...controls, minDiameterM: Math.round(v) })}
            minimumTrackTintColor={colors.accentBlue}
            maximumTrackTintColor={colors.spaceSlate}
            thumbTintColor={colors.accentBlue}
          />

          <Text className="mt-4 mb-1" style={{ color: colors.textMuted }}>
            {t('controls.within', { value: withinValue })}
          </Text>
          <Slider
            minimumValue={0.5}
            maximumValue={MAX_LUNAR_CAP}
            step={0.5}
            value={distanceValue}
            onValueChange={(v) => onChange({ ...controls, maxLunar: v >= MAX_LUNAR_CAP ? Infinity : v })}
            minimumTrackTintColor={colors.accentBlue}
            maximumTrackTintColor={colors.spaceSlate}
            thumbTintColor={colors.accentBlue}
          />

          <Pressable
            onPress={onClose}
            className="mt-6 rounded-2xl py-3 items-center"
            style={{ backgroundColor: colors.accentBlue }}
          >
            <Text className="font-bold" style={{ color: colors.spaceBlack }}>{t('controls.done')}</Text>
          </Pressable>
          <SafeAreaView edges={['bottom']} />
        </Pressable>
      </Pressable>
      </SafeAreaProvider>
    </Modal>
  );
}
