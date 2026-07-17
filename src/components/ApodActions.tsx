import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Apod } from '../types/apod';
import { saveApodToGallery, setApodAsWallpaper } from '../utils/apodImage';
import { hapticSuccess } from '../utils/haptics';
import { useSettings } from '../settings/SettingsContext';

type Job = 'save' | 'wallpaper';

function ActionButton({
  icon, label, busy, disabled, onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 flex-row items-center justify-center rounded-xl py-3"
      style={{
        backgroundColor: colors.charcoal,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        opacity: disabled && !busy ? 0.5 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.accentBlue} />
      ) : (
        <MaterialCommunityIcons name={icon} size={18} color={colors.accentBlue} />
      )}
      <Text className="ml-2 text-xs font-semibold" style={{ color: colors.textPrimary }}>{label}</Text>
    </Pressable>
  );
}

export function ApodActions({ apod }: { apod: Apod }) {
  const { settings } = useSettings();
  const [busy, setBusy] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(job: Job, action: () => Promise<void>) {
    setBusy(job);
    setError(null);
    try {
      await action();
      hapticSuccess(settings.hapticsEnabled);
    } catch (e) {
      // Surface the reason: an HD APOD is several MB and a denied permission or a
      // dropped connection must never look like a dead button.
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View className="px-5 pt-3 pb-2" style={{ borderTopWidth: 1, borderTopColor: colors.gridLineFaint }}>
      <View className="flex-row" style={{ gap: 10 }}>
        <ActionButton
          icon="download"
          label="Save to gallery"
          busy={busy === 'save'}
          disabled={busy !== null}
          onPress={() => run('save', () => saveApodToGallery(apod))}
        />
        <ActionButton
          icon="wallpaper"
          label="Set as wallpaper"
          busy={busy === 'wallpaper'}
          disabled={busy !== null}
          onPress={() => run('wallpaper', () => setApodAsWallpaper(apod))}
        />
      </View>
      {!!error && (
        <Text className="mt-2 text-xs" style={{ color: colors.threatOrange }}>{error}</Text>
      )}
    </View>
  );
}
