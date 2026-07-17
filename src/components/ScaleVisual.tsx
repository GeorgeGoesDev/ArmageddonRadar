import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { bestFitLandmark } from '../data/diameterComparisons';
import { formatInt } from '../utils/units';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n/LocaleContext';

/**
 * Draws the asteroid to scale beside its best-fit landmark. The asteroid fills
 * most of the frame; the landmark is scaled by its real-world height ratio, so
 * you see the asteroid dwarf it.
 */
export function ScaleVisual({ diameterM, width }: { diameterM: number; width: number }) {
  const { locale } = useTranslation();
  const height = 150;
  const fit = bestFitLandmark(diameterM);
  const baseY = height - 22;

  // Asteroid circle sized to ~62% of frame height.
  const astDia = Math.min(width * 0.5, (height - 40));
  const astR = astDia / 2;
  const astCx = width * 0.32;
  const astCy = baseY - astR;

  // Landmark scaled by real height ratio (clamped so it never vanishes).
  const landmarkMeters = fit?.landmark.meters ?? diameterM;
  const lmHpx = Math.max(6, astDia * (landmarkMeters / diameterM));
  const lmW = Math.max(4, lmHpx * 0.25);
  const lmX = width * 0.72;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={baseY} x2={width} y2={baseY} stroke={colors.gridLineFaint} strokeWidth={1} />
        {/* Asteroid */}
        <Circle cx={astCx} cy={astCy} r={astR} fill={colors.spaceSlate} stroke={colors.accentBlue} strokeWidth={2} />
        <SvgText x={astCx} y={astCy + 4} fill={colors.textPrimary} fontSize={12} fontWeight="700" textAnchor="middle">
          {formatInt(diameterM, locale)} m
        </SvgText>
        {/* Landmark silhouette + label */}
        <Rect x={lmX - lmW / 2} y={baseY - lmHpx} width={lmW} height={lmHpx} rx={2} fill={colors.textMuted} />
        <SvgText x={lmX} y={baseY - lmHpx - 6} fill={colors.textMuted} fontSize={16} textAnchor="middle">
          {fit?.landmark.emoji ?? '🗿'}
        </SvgText>
      </Svg>
      <Text className="text-center text-xs" style={{ color: colors.accentBlue }}>
        {fit ? `≈ ${fit.count} ${fit.count === 1 ? fit.landmark.singular : fit.landmark.plural} ${fit.landmark.emoji}` : 'Smaller than a garden gnome 🗿'}
      </Text>
    </View>
  );
}
