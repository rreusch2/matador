import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { TAB_BAR_HEIGHT, colors, fonts } from '@/constants/theme';
import { useCart } from '@/context/cart';
import { haptic } from '@/utils/haptics';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  shop: ['storefront', 'storefront-outline'],
  train: ['barbell', 'barbell-outline'],
  cart: ['bag-handle', 'bag-handle-outline'],
};

const PAD = 6;

export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { count } = useCart();
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth ? (barWidth - PAD * 2) / state.routes.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    if (tabWidth) x.value = withSpring(state.index * tabWidth, { damping: 18, stiffness: 180, mass: 0.8 });
  }, [state.index, tabWidth]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom - 14, 8) }]}>
      <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {Platform.OS === 'ios' ? (
          <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />
        ) : null}
        {tabWidth > 0 && (
          <Animated.View style={[styles.indicator, { width: tabWidth }, indicator]} />
        )}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name).toUpperCase();
          const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const color = focused ? colors.black : colors.muted;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.select();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View>
                {route.name === 'index' ? (
                  <Logo
                    width={26}
                    color={focused ? 'black' : 'white'}
                    style={!focused && { opacity: 0.55 }}
                  />
                ) : (
                  <Ionicons name={focused ? on : off} size={21} color={color} />
                )}
                {route.name === 'cart' && count > 0 && (
                  <View style={[styles.badge, focused && { backgroundColor: colors.black }]}>
                    <Text style={[styles.badgeText, focused && { color: colors.yellow }]}>{count}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(18,18,18,0.72)' : 'rgba(16,16,16,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
  },
  indicator: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    bottom: PAD,
    borderRadius: (TAB_BAR_HEIGHT - PAD * 2) / 2,
    backgroundColor: colors.yellow,
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: fonts.black, fontSize: 9, letterSpacing: 1.2 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.black, fontSize: 9, color: colors.black },
});
