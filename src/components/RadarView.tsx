import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../theme/colors';
import { Asteroid } from '../types/neo';
import { angleFromId, clamp, polarToCartesian } from '../utils/geometry';

// Precomputed fading tail for the radar sweep: a fan of lines trailing the
// leading edge, each dimmer than the last, so it reads as a smooth glowing wipe.
const SWEEP_TAIL = Array.from({ length: 22 }, (_, i) => ({
  offset: i * 2.6, // degrees behind the leading edge
  opacity: 0.5 * Math.pow(1 - i / 22, 1.6),
}));

interface RadarViewProps {
  asteroids: Asteroid[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  size?: number;
}

/**
 * Glowing concentric radar with an animated sweep. Each asteroid is a dot
 * placed radially by its miss distance (closer to Earth = closer to centre);
 * the selected asteroid glows orange with a pulsing halo. Tapping a dot selects
 * it, staying in sync with the tracking card list.
 */
export function RadarView({ asteroids, selectedId, onSelect, size = 300 }: RadarViewProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 12;

  // Scale: furthest asteroid (or 5 LD, whichever larger) sits at the rim.
  const maxLunar = useMemo(
    () => Math.max(5, ...asteroids.map((a) => a.missLunar)) * 1.05,
    [asteroids],
  );

  const dots = useMemo(
    () =>
      asteroids.map((a) => {
        const r = clamp((a.missLunar / maxLunar) * maxR, 10, maxR - 6);
        const angle = angleFromId(a.id);
        const p = polarToCartesian(cx, cy, r, angle);
        return { asteroid: a, ...p };
      }),
    [asteroids, maxLunar, maxR, cx, cy],
  );

  // Continuous sweep rotation.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const sweepRotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Pulsing halo for the selected dot.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.05] });
  const haloRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [10, 22] });

  const rings = [0.33, 0.66, 1];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#10202A" />
            <Stop offset="1" stopColor={colors.spaceBlack} />
          </RadialGradient>
        </Defs>

        {/* Backdrop */}
        <Circle cx={cx} cy={cy} r={maxR} fill="url(#radarBg)" stroke={colors.cardBorder} strokeWidth={1} />

        {/* Range rings */}
        {rings.map((f, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={maxR * f}
            fill="none"
            stroke={colors.gridLine}
            strokeWidth={1}
          />
        ))}

        {/* Crosshair */}
        <Line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke={colors.gridLineFaint} strokeWidth={1} />
        <Line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke={colors.gridLineFaint} strokeWidth={1} />

        {/* Range labels (in lunar distances) */}
        {rings.map((f, i) => (
          <SvgText
            key={`lbl-${i}`}
            x={cx + 4}
            y={cy - maxR * f + 12}
            fill={colors.textMuted}
            fontSize={9}
            opacity={0.7}
          >
            {(maxLunar * f).toFixed(0)} LD
          </SvgText>
        ))}

        {/* Selected halo (rendered under dots) */}
        {dots
          .filter((d) => d.asteroid.id === selectedId)
          .map((d) => (
            <AnimatedCircle
              key={`halo-${d.asteroid.id}`}
              cx={d.x}
              cy={d.y}
              r={haloRadius}
              fill={colors.threatOrange}
              opacity={haloOpacity}
            />
          ))}

        {/* Asteroid dots */}
        {dots.map((d) => {
          const selected = d.asteroid.id === selectedId;
          const dotColor = selected
            ? colors.threatOrange
            : d.asteroid.hazardous
            ? colors.threatYellow
            : colors.accentBlue;
          return (
            <G key={d.asteroid.id} onPress={() => onSelect(d.asteroid.id)}>
              {/* Enlarged invisible hit area */}
              <Circle cx={d.x} cy={d.y} r={18} fill="transparent" />
              <Circle
                cx={d.x}
                cy={d.y}
                r={selected ? 7 : 4.5}
                fill={dotColor}
                stroke={colors.spaceBlack}
                strokeWidth={selected ? 2 : 1}
              />
            </G>
          );
        })}
      </Svg>

      {/* Rotating sweep overlay. Animated `rotation` on an SVG <G> ignores its
          origin/translate props (it pins to 0,0), so instead we spin a plain RN
          view — which reliably pivots about its own centre, exactly the radar
          centre here. pointerEvents=none lets dot taps pass through. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          transform: [{ rotate: sweepRotation }],
        }}
      >
        <Svg width={size} height={size}>
          {/* Sweep rotates clockwise, so the tail trails to the LEFT of the
              leading edge (larger polar angle = 90 + offset). */}
          {SWEEP_TAIL.map((seg) => {
            const p = polarToCartesian(cx, cy, maxR, 90 + seg.offset);
            return (
              <Line
                key={seg.offset}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke={colors.accentBlue}
                strokeWidth={2}
                strokeOpacity={seg.opacity}
                strokeLinecap="round"
              />
            );
          })}
          {/* Crisp leading edge */}
          <Line
            x1={cx}
            y1={cy}
            x2={polarToCartesian(cx, cy, maxR, 90).x}
            y2={polarToCartesian(cx, cy, maxR, 90).y}
            stroke={colors.accentBlue}
            strokeWidth={2.5}
            strokeOpacity={0.95}
            strokeLinecap="round"
          />
          {/* Glowing hub emitter at the centre */}
          <Circle cx={cx} cy={cy} r={4} fill={colors.accentBlue} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
