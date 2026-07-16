import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SORT_OPTIONS, SortDir, SortField } from '../utils/listControls';

interface Props {
  visible: boolean;
  field: SortField;
  dir: SortDir;
  onSelect: (field: SortField, dir: SortDir) => void;
  onClose: () => void;
}

export function SortSheet({ visible, field, dir, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <Pressable className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder }}>
          <View className="items-center mb-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.textMuted }} />
          </View>
          <Text className="text-lg font-bold mb-2" style={{ color: colors.textPrimary }}>Sort by</Text>
          {SORT_OPTIONS.map((opt) => {
            const active = opt.field === field && opt.dir === dir;
            return (
              <Pressable
                key={opt.label}
                onPress={() => { onSelect(opt.field, opt.dir); onClose(); }}
                className="flex-row items-center justify-between py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}
              >
                <Text className="text-sm" style={{ color: active ? colors.accentBlue : colors.textPrimary }}>{opt.label}</Text>
                {active && <MaterialCommunityIcons name="check" size={18} color={colors.accentBlue} />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
