import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors } from '../theme/colors';

/** A single shimmering placeholder block. */
function Shimmer({ className, style }: { className?: string; style?: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={[{ backgroundColor: colors.spaceSlate, opacity }, style]}
    />
  );
}

/** Skeleton mirroring the gauge + tracking-card grid while data loads. */
export function LoadingSkeleton() {
  return (
    <View className="px-4">
      {/* Gauge placeholder */}
      <View className="items-center my-6">
        <Shimmer className="rounded-full" style={{ width: 200, height: 100, borderTopLeftRadius: 100, borderTopRightRadius: 100 }} />
      </View>
      <Shimmer className="rounded-2xl mb-6" style={{ height: 44 }} />
      {/* Radar placeholder */}
      <View className="items-center mb-6">
        <Shimmer className="rounded-full" style={{ width: 240, height: 240 }} />
      </View>
      {/* Card placeholders */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="rounded-2xl p-4 mb-3"
          style={{ backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.gridLineFaint }}
        >
          <Shimmer className="rounded-md mb-3" style={{ height: 18, width: '55%' }} />
          <View className="flex-row">
            <Shimmer className="rounded-md mr-3" style={{ height: 28, flex: 1 }} />
            <Shimmer className="rounded-md" style={{ height: 28, flex: 1 }} />
          </View>
        </View>
      ))}
    </View>
  );
}
