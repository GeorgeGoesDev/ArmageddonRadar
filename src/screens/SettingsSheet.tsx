import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSettings } from '../settings/SettingsContext';
import { DistanceUnit, VelocityUnit } from '../utils/units';
import { useTranslation } from '../i18n/LocaleContext';
import { Locale } from '../i18n/i18n';
import { formatNumber } from '../i18n/format';

const REPO_URL = 'https://github.com/GeorgeGoesDev/ArmageddonRadar';

function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View className="flex-row rounded-xl overflow-hidden" style={{ borderWidth: 1, borderColor: colors.gridLineFaint }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} className="flex-1 py-2 items-center" style={{ backgroundColor: active ? colors.accentBlue : colors.charcoal }}>
            <Text className="text-xs font-semibold" style={{ color: active ? colors.spaceBlack : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const { t, locale, setLocale } = useTranslation();
  const queryClient = useQueryClient();
  const [keyDraft, setKeyDraft] = useState(settings.apiKeyOverride ?? '');

  // Re-seed the key field from persisted settings whenever the sheet opens
  // (settings hydrate from AsyncStorage after first render).
  useEffect(() => {
    if (visible) setKeyDraft(settings.apiKeyOverride ?? '');
  }, [visible, settings.apiKeyOverride]);

  const saveKey = () => {
    update({ apiKeyOverride: keyDraft.trim() || null });
    queryClient.invalidateQueries({ queryKey: ['neo-week'] });
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, height: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>{t('settings.title')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView className="px-5" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            <Text className="mt-3 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.language')}</Text>
            <Segmented<Locale>
              options={[{ key: 'en', label: 'English' }, { key: 'el', label: 'Ελληνικά' }]}
              value={locale}
              onChange={setLocale}
            />

            <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.distanceUnit')}</Text>
            <Segmented<DistanceUnit>
              options={[{ key: 'lunar', label: t('settings.unitLunar') }, { key: 'km', label: 'km' }, { key: 'miles', label: 'miles' }]}
              value={settings.distanceUnit}
              onChange={(v) => update({ distanceUnit: v })}
            />

            <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.velocityUnit')}</Text>
            <Segmented<VelocityUnit>
              options={[{ key: 'kph', label: 'km/h' }, { key: 'mph', label: 'mph' }]}
              value={settings.velocityUnit}
              onChange={(v) => update({ velocityUnit: v })}
            />

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.threatThresholds')}</Text>
            <Text className="mb-1 text-xs" style={{ color: colors.textMuted }}>{t('settings.redAlertUnder', { value: formatNumber(settings.dangerLD, locale, 1) })}</Text>
            <Slider minimumValue={0.2} maximumValue={Math.min(3, settings.safeLD - 0.5)} step={0.1} value={settings.dangerLD} onValueChange={(v) => update({ dangerLD: Math.round(v * 10) / 10 })} minimumTrackTintColor={colors.threatOrange} maximumTrackTintColor={colors.spaceSlate} thumbTintColor={colors.threatOrange} />
            <Text className="mt-2 mb-1 text-xs" style={{ color: colors.textMuted }}>{t('settings.completelySafeAbove', { value: formatNumber(settings.safeLD, locale, 1) })}</Text>
            <Slider minimumValue={Math.max(3, settings.dangerLD + 0.5)} maximumValue={15} step={0.5} value={settings.safeLD} onValueChange={(v) => update({ safeLD: Math.round(v * 2) / 2 })} minimumTrackTintColor={colors.safeGreen} maximumTrackTintColor={colors.spaceSlate} thumbTintColor={colors.safeGreen} />

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.feedback')}</Text>
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>{t('settings.haptics')}</Text>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(v) => update({ hapticsEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            <Pressable onPress={() => { update({ onboardingComplete: false }); onClose(); }} className="py-2">
              <Text style={{ color: colors.accentBlue }}>{t('settings.replayIntro')}</Text>
            </Pressable>

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.notifications')}</Text>
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>{t('settings.dailyDigest')}</Text>
              <Switch
                value={settings.dailyDigestEnabled}
                onValueChange={(v) => update({ dailyDigestEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            {settings.dailyDigestEnabled && (
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-xs" style={{ color: colors.textMuted }}>{t('settings.digestTime')}</Text>
                <View className="flex-row items-center">
                  <Pressable onPress={() => update({ digestHour: (settings.digestHour + 23) % 24 })} hitSlop={8} className="px-2">
                    <MaterialCommunityIcons name="minus-circle-outline" size={22} color={colors.accentBlue} />
                  </Pressable>
                  <Text className="w-14 text-center text-sm font-semibold" style={{ color: colors.textPrimary }}>
                    {String(settings.digestHour).padStart(2, '0')}:00
                  </Text>
                  <Pressable onPress={() => update({ digestHour: (settings.digestHour + 1) % 24 })} hitSlop={8} className="px-2">
                    <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.accentBlue} />
                  </Pressable>
                </View>
              </View>
            )}
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>{t('settings.smartAlerts')}</Text>
              <Switch
                value={settings.smartAlertsEnabled}
                onValueChange={(v) => update({ smartAlertsEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            <Text className="text-[11px] mb-1" style={{ color: colors.textMuted }}>
              {t('settings.smartAlertsCaption')}
            </Text>

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.apiKeyTitle')}</Text>
            <TextInput value={keyDraft} onChangeText={setKeyDraft} placeholder={t('settings.apiKeyPlaceholder')} placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} className="rounded-xl px-3 py-2 text-sm" style={{ color: colors.textPrimary, backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }} />
            <Pressable onPress={saveKey} className="mt-2 rounded-xl py-2 items-center" style={{ backgroundColor: colors.accentPurple }}>
              <Text className="font-bold" style={{ color: colors.textPrimary }}>{t('settings.saveKey')}</Text>
            </Pressable>

            <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>{t('settings.about')}</Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>{t('settings.appVersion', { version: Constants.expoConfig?.version ?? '1.0.0' })}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>{t('settings.dataSource')}</Text>
            <Pressable onPress={() => Linking.openURL(REPO_URL)} className="mt-1">
              <Text className="text-xs" style={{ color: colors.accentBlue }}>{t('settings.sourceOnGithub')}</Text>
            </Pressable>
          </ScrollView>
          </SafeAreaView>
        </View>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}
