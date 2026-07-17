import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Apod } from '../types/apod';
import { saveApodToGallery, setApodAsWallpaper } from '../utils/apodImage';
import { hapticSuccess } from '../utils/haptics';
import { useSettings } from '../settings/SettingsContext';

type Job = 'save' | 'wallpaper';

const DONE_DISPLAY_MS = 1500;

function ActionButton({
  icon, label, busy, done, doneLabel, disabled, onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  busy: boolean;
  done: boolean;
  doneLabel: string;
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
        <MaterialCommunityIcons
          name={done ? 'check' : icon}
          size={18}
          color={colors.accentBlue}
        />
      )}
      <Text className="ml-2 text-xs font-semibold" style={{ color: colors.textPrimary }}>
        {done ? doneLabel : label}
      </Text>
    </Pressable>
  );
}

export function ApodActions({ apod }: { apod: Apod }) {
  const { settings } = useSettings();
  const [busy, setBusy] = useState<Job | null>(null);
  const [done, setDone] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (doneTimeoutRef.current) {
      clearTimeout(doneTimeoutRef.current);
    }
  }, []);

  async function run(job: Job, action: () => Promise<void>) {
    if (doneTimeoutRef.current) {
      clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
    setBusy(job);
    setError(null);
    setDone(null);
    try {
      await action();
      hapticSuccess(settings.hapticsEnabled);
      setDone(job);
      doneTimeoutRef.current = setTimeout(() => setDone(null), DONE_DISPLAY_MS);
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
          done={done === 'save'}
          doneLabel="Saved"
          disabled={busy !== null}
          onPress={() => run('save', () => saveApodToGallery(apod))}
        />
        <ActionButton
          icon="wallpaper"
          label="Set as wallpaper"
          busy={busy === 'wallpaper'}
          done={done === 'wallpaper'}
          doneLabel="Opening..."
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
