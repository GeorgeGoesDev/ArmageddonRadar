import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSettings } from '../settings/SettingsContext';
import { DistanceUnit, VelocityUnit } from '../utils/units';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>Settings</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView className="px-5" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
            <Text className="mt-3 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Distance unit</Text>
            <Segmented<DistanceUnit>
              options={[{ key: 'lunar', label: 'Lunar' }, { key: 'km', label: 'km' }, { key: 'miles', label: 'miles' }]}
              value={settings.distanceUnit}
              onChange={(v) => update({ distanceUnit: v })}
            />

            <Text className="mt-4 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Velocity unit</Text>
            <Segmented<VelocityUnit>
              options={[{ key: 'kph', label: 'km/h' }, { key: 'mph', label: 'mph' }]}
              value={settings.velocityUnit}
              onChange={(v) => update({ velocityUnit: v })}
            />

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Threat thresholds</Text>
            <Text className="mb-1 text-xs" style={{ color: colors.textMuted }}>Red alert under {settings.dangerLD.toFixed(1)} LD</Text>
            <Slider minimumValue={0.2} maximumValue={Math.min(3, settings.safeLD - 0.5)} step={0.1} value={settings.dangerLD} onValueChange={(v) => update({ dangerLD: Math.round(v * 10) / 10 })} minimumTrackTintColor={colors.threatOrange} maximumTrackTintColor={colors.spaceSlate} thumbTintColor={colors.threatOrange} />
            <Text className="mt-2 mb-1 text-xs" style={{ color: colors.textMuted }}>Completely safe above {settings.safeLD.toFixed(1)} LD</Text>
            <Slider minimumValue={Math.max(3, settings.dangerLD + 0.5)} maximumValue={15} step={0.5} value={settings.safeLD} onValueChange={(v) => update({ safeLD: Math.round(v * 2) / 2 })} minimumTrackTintColor={colors.safeGreen} maximumTrackTintColor={colors.spaceSlate} thumbTintColor={colors.safeGreen} />

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Feedback</Text>
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>Haptics</Text>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(v) => update({ hapticsEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            <Pressable onPress={() => { update({ onboardingComplete: false }); onClose(); }} className="py-2">
              <Text style={{ color: colors.accentBlue }}>Replay intro</Text>
            </Pressable>

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>Notifications</Text>
            <View className="flex-row items-center justify-between py-1">
              <Text style={{ color: colors.textPrimary }}>Daily digest</Text>
              <Switch
                value={settings.dailyDigestEnabled}
                onValueChange={(v) => update({ dailyDigestEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            {settings.dailyDigestEnabled && (
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-xs" style={{ color: colors.textMuted }}>Digest time</Text>
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
              <Text style={{ color: colors.textPrimary }}>Smart alerts</Text>
              <Switch
                value={settings.smartAlertsEnabled}
                onValueChange={(v) => update({ smartAlertsEnabled: v })}
                trackColor={{ true: colors.accentBlue, false: colors.spaceSlate }}
              />
            </View>
            <Text className="text-[11px] mb-1" style={{ color: colors.textMuted }}>
              Auto-notify when an asteroid comes within your danger distance. Needs a real build (not Expo Go).
            </Text>

            <Text className="mt-5 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>NASA API key</Text>
            <TextInput value={keyDraft} onChangeText={setKeyDraft} placeholder="DEMO_KEY (built-in)" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} className="rounded-xl px-3 py-2 text-sm" style={{ color: colors.textPrimary, backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }} />
            <Pressable onPress={saveKey} className="mt-2 rounded-xl py-2 items-center" style={{ backgroundColor: colors.accentPurple }}>
              <Text className="font-bold" style={{ color: colors.textPrimary }}>Save key</Text>
            </Pressable>

            <Text className="mt-6 mb-1 text-xs uppercase tracking-widest" style={{ color: colors.accentBlue }}>About</Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>Armageddon Radar v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Data: NASA NeoWs (api.nasa.gov)</Text>
            <Pressable onPress={() => Linking.openURL(REPO_URL)} className="mt-1">
              <Text className="text-xs" style={{ color: colors.accentBlue }}>Source on GitHub</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
