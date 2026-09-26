import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/constants/theme';

type Props = {
  items: string[];
  background: string;
  color: string;
  rotate?: number;
  reverse?: boolean;
  speed?: number;
  style?: ViewStyle;
};

export function Marquee({ items, background, color, rotate = 0, reverse, speed = 40, style }: Props) {
  const [segmentWidth, setSegmentWidth] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!segmentWidth) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(-segmentWidth, { duration: (segmentWidth / speed) * 1000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(x);
  }, [segmentWidth, speed]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: reverse ? -segmentWidth - x.value : x.value }],
  }));

  const segment = (
    <View
      style={styles.segment}
      onLayout={(e) => !segmentWidth && setSegmentWidth(e.nativeEvent.layout.width)}
    >
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={[styles.text, { color }]}>{item}</Text>
          <Text style={[styles.star, { color }]}>{'\u2726'}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.band,
        { backgroundColor: background, transform: [{ rotate: `${rotate}deg` }] },
        style,
      ]}
    >
      <Animated.View style={[styles.row, animated]}>
        {segment}
        {segment}
        {segment}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    height: 46,
    overflow: 'hidden',
    justifyContent: 'center',
    marginHorizontal: -40,
  },
  row: { flexDirection: 'row' },
  segment: { flexDirection: 'row' },
  item: { flexDirection: 'row', alignItems: 'center' },
  text: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1.5, paddingHorizontal: 14 },
  star: { fontSize: 14 },
});
