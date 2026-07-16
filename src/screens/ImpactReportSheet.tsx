import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asteroid } from '../types/neo';
import { ImpactReport } from '../components/ImpactReport';
import { colors } from '../theme/colors';
import { useSettings } from '../settings/SettingsContext';
import { hapticSuccess } from '../utils/haptics';

export function ImpactReportSheet({ asteroid, visible, onClose }: { asteroid: Asteroid | null; visible: boolean; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const shotRef = useRef<View>(null);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = Math.min(width - 24, 400);

  const share = async () => {
    setError(null);
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1 });
      if (!(await Sharing.isAvailableAsync())) {
        setError('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri);
      hapticSuccess(settings.hapticsEnabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the image.');
    }
  };

  if (!asteroid) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View className="rounded-t-3xl" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder, maxHeight: '92%' }}>
          <View className="flex-row items-center justify-end px-4 pt-3">
            <Pressable onPress={onClose} hitSlop={12}><MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} /></Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 24 }}>
            <View ref={shotRef} collapsable={false} style={{ backgroundColor: colors.spaceBlack, borderRadius: 16, overflow: 'hidden' }}>
              <ImpactReport asteroid={asteroid} width={cardWidth} />
            </View>
            {error && <Text className="mt-2 text-xs" style={{ color: colors.threatOrange }}>{error}</Text>}
            <Pressable onPress={share} className="mt-4 rounded-2xl px-6 py-3 flex-row items-center" style={{ backgroundColor: colors.accentBlue }}>
              <MaterialCommunityIcons name="share-variant" size={18} color={colors.spaceBlack} />
              <Text className="ml-2 font-bold" style={{ color: colors.spaceBlack }}>Share image</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
