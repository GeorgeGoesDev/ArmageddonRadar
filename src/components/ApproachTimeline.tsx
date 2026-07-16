import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ApproachEntry } from '../types/neoDetail';
import { timelinePoints } from '../utils/orbitTimeline';
import { getThreatLevel } from '../utils/threat';
import { useThresholds } from '../settings/useFormatters';
import { colors } from '../theme/colors';

export function ApproachTimeline({ approaches, width }: { approaches: ApproachEntry[]; width: number }) {
  const thresholds = useThresholds();
  const height = 120;
  const pts = timelinePoints(approaches, width, height);
  if (pts.length === 0) return null;

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const closest = pts.reduce((m, p) => (p.entry.missLunar < m.entry.missLunar ? p : m), pts[0]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - 6} x2={width} y2={height - 6} stroke={colors.gridLineFaint} strokeWidth={1} />
        {pts.length > 1 && <Path d={path} stroke={colors.gridLine} strokeWidth={1} fill="none" />}
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p === closest ? 5 : 3}
            fill={getThreatLevel(p.entry.missLunar, thresholds).color}
            stroke={colors.spaceBlack}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}
