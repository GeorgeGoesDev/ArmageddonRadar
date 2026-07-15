import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getThreatLevel } from '../utils/threat';
import { colors } from '../theme/colors';

interface VerdictBannerProps {
  lunar: number;
}

const GRADIENTS: Record<string, [string, string]> = {
  danger: [colors.threatYellow, colors.threatOrange],
  watch: ['#B9962A', colors.threatYellow],
  safe: ['#12403A', colors.safeGreen],
};

/** The cheeky verdict banner that sits below the gauge. */
export function VerdictBanner({ lunar }: VerdictBannerProps) {
  const { verdict, zone } = getThreatLevel(lunar);
  const gradient = GRADIENTS[zone];
  const darkText = zone !== 'safe';

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}
    >
      <Text
        className="text-center text-base font-semibold"
        style={{ color: darkText ? colors.spaceBlack : colors.textPrimary }}
      >
        {verdict}
      </Text>
    </LinearGradient>
  );
}
