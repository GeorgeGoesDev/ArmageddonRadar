import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../theme/colors';
import { describeArc, polarToCartesian } from '../utils/geometry';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { useTranslation } from '../i18n/LocaleContext';

interface ThreatGaugeProps {
  /** Closest asteroid's miss distance in lunar distances. */
  lunar: number;
  size?: number;
}

/**
 * Custom semi-circular threat gauge. The coloured arc runs green → yellow →
 * orange (left = safe, right = red alert); the needle position is driven by the
 * normalised threat value and animates smoothly whenever `lunar` changes.
 */
export function ThreatGauge({ lunar, size = 260 }: ThreatGaugeProps) {
  const width = size;
  const height = size * 0.62;
  const cx = width / 2;
  const cy = height - 12;
  const radius = width / 2 - 22;
  const stroke = 16;

  const thresholds = useThresholds();
  const { t } = useTranslation();
  const { t: intensity, color } = getThreatLevel(lunar, thresholds);

  // Needle sweeps from 180° (safe, left) to 0° (danger, right).
  const targetAngle = 180 * (1 - intensity);
  const angle = useRef(new Animated.Value(180)).current;

  useEffect(() => {
    Animated.spring(angle, {
      toValue: targetAngle,
      // JS driver everywhere — keeps drivers consistent with the radar sweep so
      // no animated node is ever shared between native and JS drivers.
      useNativeDriver: false,
      friction: 7,
      tension: 40,
    }).start();
  }, [targetAngle, angle]);

  // Needle rotation as a degree string for the RN view transform. Rotation is
  // clockwise and the needle is drawn pointing up, so +90° = right (danger),
  // -90° = left (safe).
  const needleRotation = angle.interpolate({
    inputRange: [0, 180],
    outputRange: ['90deg', '-90deg'],
  });

  // Tick marks around the arc.
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = 180 - (i * 180) / 10;
    const outer = polarToCartesian(cx, cy, radius + stroke / 2 + 4, a);
    const inner = polarToCartesian(cx, cy, radius + stroke / 2 - 2, a);
    return { outer, inner, major: i % 5 === 0 };
  });

  return (
    <View style={{ width, height }}>
      {/* Needle: rotate a plain RN view whose centre sits on the hub (cx,cy).
          Rendered under the dial Svg so the centre readout stays on top. RN
          views pivot about their own centre — unlike an animated SVG <G>, whose
          origin/translate props are ignored when `rotation` is animated. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - radius,
          top: cy - radius,
          width: radius * 2,
          height: radius * 2,
          transform: [{ rotate: needleRotation }],
        }}
      >
        <Svg width={radius * 2} height={radius * 2}>
          <Line
            x1={radius}
            y1={radius}
            x2={radius}
            y2={6}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.safeGreen} />
            <Stop offset="0.28" stopColor={colors.accentBlue} />
            <Stop offset="0.6" stopColor={colors.threatYellow} />
            <Stop offset="1" stopColor={colors.threatOrange} />
          </LinearGradient>
        </Defs>

        {/* Faint background track */}
        <Path
          d={describeArc(cx, cy, radius, 180, 0)}
          stroke={colors.spaceSlate}
          strokeWidth={stroke + 6}
          strokeLinecap="round"
          fill="none"
        />
        {/* Glow underlay */}
        <Path
          d={describeArc(cx, cy, radius, 180, 0)}
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={stroke + 10}
          strokeLinecap="round"
          fill="none"
        />
        {/* Coloured threat arc */}
        <Path
          d={describeArc(cx, cy, radius, 180, 0)}
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />

        {/* Tick marks */}
        {ticks.map((tk, i) => (
          <Line
            key={i}
            x1={tk.inner.x}
            y1={tk.inner.y}
            x2={tk.outer.x}
            y2={tk.outer.y}
            stroke={colors.gridLine}
            strokeWidth={tk.major ? 2 : 1}
          />
        ))}

        <Circle cx={cx} cy={cy} r={9} fill={colors.charcoal} stroke={color} strokeWidth={3} />

        {/* Centre readout */}
        <SvgText
          x={cx}
          y={cy - radius * 0.42}
          fill={colors.textPrimary}
          fontSize={34}
          fontWeight="700"
          textAnchor="middle"
        >
          {lunar.toFixed(1)}
        </SvgText>
        <SvgText
          x={cx}
          y={cy - radius * 0.42 + 20}
          fill={colors.textMuted}
          fontSize={12}
          textAnchor="middle"
        >
          {t('detail.lunarDistances')}
        </SvgText>
      </Svg>

      {/* End-zone labels */}
      <View className="absolute left-1 bottom-0 flex-row items-center">
        <View
          className="h-2 w-2 rounded-full mr-1"
          style={{ backgroundColor: colors.safeGreen }}
        />
      </View>
      <View className="absolute right-1 bottom-0 flex-row items-center">
        <View
          className="h-2 w-2 rounded-full ml-1"
          style={{ backgroundColor: colors.threatOrange }}
        />
      </View>
    </View>
  );
}
