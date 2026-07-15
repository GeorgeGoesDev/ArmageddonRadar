import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { activeFilterCount, ListControls, SortKey } from '../utils/listControls';
import { FilterSheet } from './FilterSheet';

const SORT_ORDER: SortKey[] = ['closest', 'largest', 'fastest'];
const SORT_LABEL: Record<SortKey, string> = { closest: 'Closest', largest: 'Largest', fastest: 'Fastest' };

export function ListControlsBar({ controls, onChange }: { controls: ListControls; onChange: (c: ListControls) => void }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filters = activeFilterCount(controls);

  const cycleSort = () => {
    const next = SORT_ORDER[(SORT_ORDER.indexOf(controls.sort) + 1) % SORT_ORDER.length];
    onChange({ ...controls, sort: next });
  };

  return (
    <View className="px-4 flex-row items-center" style={{ gap: 8 }}>
      <View
        className="flex-1 flex-row items-center rounded-xl px-3"
        style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}
      >
        <MaterialCommunityIcons name="magnify" size={16} color={colors.textMuted} />
        <TextInput
          value={controls.search}
          onChangeText={(t) => onChange({ ...controls, search: t })}
          placeholder="Search"
          placeholderTextColor={colors.textMuted}
          className="flex-1 ml-2 py-2 text-sm"
          style={{ color: colors.textPrimary }}
        />
      </View>

      <Pressable onPress={cycleSort} className="rounded-xl px-3 py-2 flex-row items-center" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}>
        <MaterialCommunityIcons name="sort" size={16} color={colors.accentBlue} />
        <Text className="ml-1 text-xs" style={{ color: colors.textPrimary }}>{SORT_LABEL[controls.sort]}</Text>
      </Pressable>

      <Pressable onPress={() => setFilterOpen(true)} className="rounded-xl px-3 py-2 flex-row items-center" style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: filters > 0 ? colors.accentBlue : colors.gridLineFaint }}>
        <MaterialCommunityIcons name="tune-variant" size={16} color={filters > 0 ? colors.accentBlue : colors.textMuted} />
        {filters > 0 && <Text className="ml-1 text-xs font-bold" style={{ color: colors.accentBlue }}>{filters}</Text>}
      </Pressable>

      <FilterSheet visible={filterOpen} controls={controls} onChange={onChange} onClose={() => setFilterOpen(false)} />
    </View>
  );
}
