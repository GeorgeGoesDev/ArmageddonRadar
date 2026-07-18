import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { activeFilterCount, ListControls } from '../utils/listControls';
import { FilterSheet } from './FilterSheet';
import { SortSheet, sortOptionLabelKey } from './SortSheet';
import { useTranslation } from '../i18n/LocaleContext';

export function ListControlsBar({ controls, onChange }: { controls: ListControls; onChange: (c: ListControls) => void }) {
  const { t } = useTranslation();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filters = activeFilterCount(controls);

  return (
    <View className="px-4 flex-row items-center" style={{ gap: 8 }}>
      <View className="flex-1 flex-row items-center rounded-xl px-3" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}>
        <MaterialCommunityIcons name="magnify" size={16} color={colors.textMuted} />
        <TextInput
          value={controls.search}
          onChangeText={(value) => onChange({ ...controls, search: value })}
          placeholder={t('controls.search')}
          placeholderTextColor={colors.textMuted}
          className="flex-1 ml-2 py-2 text-sm"
          style={{ color: colors.textPrimary }}
        />
      </View>

      <Pressable onPress={() => setSortOpen(true)} className="rounded-xl px-3 py-2 flex-row items-center" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}>
        <MaterialCommunityIcons name="sort" size={16} color={colors.accentBlue} />
        <Text className="ml-1 text-xs" style={{ color: colors.textPrimary }}>{t(sortOptionLabelKey(controls.sortField, controls.sortDir))}</Text>
        <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textMuted} />
      </Pressable>

      <Pressable onPress={() => setFilterOpen(true)} className="rounded-xl px-3 py-2 flex-row items-center" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: filters > 0 ? colors.accentBlue : colors.gridLineFaint }}>
        <MaterialCommunityIcons name="tune-variant" size={16} color={filters > 0 ? colors.accentBlue : colors.textMuted} />
        {filters > 0 && <Text className="ml-1 text-xs font-bold" style={{ color: colors.accentBlue }}>{filters}</Text>}
      </Pressable>

      <SortSheet
        visible={sortOpen}
        field={controls.sortField}
        dir={controls.sortDir}
        onSelect={(field, dir) => onChange({ ...controls, sortField: field, sortDir: dir })}
        onClose={() => setSortOpen(false)}
      />
      <FilterSheet visible={filterOpen} controls={controls} onChange={onChange} onClose={() => setFilterOpen(false)} />
    </View>
  );
}
