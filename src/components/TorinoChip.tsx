import React from 'react';
import { Text, View } from 'react-native';
import { torinoColor } from '../utils/torino';

export function TorinoChip({ level }: { level: number }) {
  const color = torinoColor(level);
  return (
    <View
      className="px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}22`, borderWidth: 1, borderColor: color }}
    >
      <Text className="text-[10px] font-bold" style={{ color }}>
        Torino {level}
      </Text>
    </View>
  );
}
