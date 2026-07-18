import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SORT_OPTIONS, SortDir, SortField } from '../utils/listControls';
import { useTranslation } from '../i18n/LocaleContext';

interface Props {
  visible: boolean;
  field: SortField;
  dir: SortDir;
  onSelect: (field: SortField, dir: SortDir) => void;
  onClose: () => void;
}

// Maps a sort field+direction combo to its catalog key. Kept here (rather than
// in utils/listControls.ts, whose SORT_OPTIONS.label strings are internal
// identifiers only) so the displayed text is always translated.
const SORT_LABEL_KEYS: Record<string, string> = {
  'distance-asc': 'controls.sortClosest',
  'distance-desc': 'controls.sortFarthest',
  'size-desc': 'controls.sortLargest',
  'size-asc': 'controls.sortSmallest',
  'speed-desc': 'controls.sortFastest',
  'speed-asc': 'controls.sortSlowest',
  'name-asc': 'controls.sortNameAZ',
  'name-desc': 'controls.sortNameZA',
};

export function sortOptionLabelKey(field: SortField, dir: SortDir): string {
  return SORT_LABEL_KEYS[`${field}-${dir}`] ?? 'controls.sort';
}

export function SortSheet({ visible, field, dir, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <Pressable className="rounded-t-3xl px-5 pt-4 pb-8" style={{ backgroundColor: colors.spaceBlack, borderTopWidth: 1, borderColor: colors.cardBorder }}>
          <View className="items-center mb-3">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.textMuted }} />
          </View>
          <Text className="text-lg font-bold mb-2" style={{ color: colors.textPrimary }}>{t('controls.sortBy')}</Text>
          {SORT_OPTIONS.map((opt) => {
            const active = opt.field === field && opt.dir === dir;
            return (
              <Pressable
                key={opt.label}
                onPress={() => { onSelect(opt.field, opt.dir); onClose(); }}
                className="flex-row items-center justify-between py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.gridLineFaint }}
              >
                <Text className="text-sm" style={{ color: active ? colors.accentBlue : colors.textPrimary }}>{t(sortOptionLabelKey(opt.field, opt.dir))}</Text>
                {active && <MaterialCommunityIcons name="check" size={18} color={colors.accentBlue} />}
              </Pressable>
            );
          })}
          <SafeAreaView edges={['bottom']} />
        </Pressable>
      </Pressable>
      </SafeAreaProvider>
    </Modal>
  );
}
