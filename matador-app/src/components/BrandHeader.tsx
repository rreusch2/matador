import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { IconButton } from '@/components/ui';
import { HEADER_BRAND, colors, fonts } from '@/constants/theme';
import { useCart } from '@/context/cart';

export function BrandHeader({ scrollY, pinned = true }: { scrollY?: SharedValue<number>; pinned?: boolean }) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();
  const background = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP) : 1,
  }));

  return (
    <View style={[pinned ? styles.header : styles.inline, { paddingTop: insets.top + HEADER_BRAND.top }]}>
      {pinned ? <Animated.View style={[StyleSheet.absoluteFill, styles.background, background]} /> : null}
      <View style={styles.brand}>
        <Logo width={HEADER_BRAND.logoWidth} color="yellow" />
        <Text style={styles.brandText}>MATADOR</Text>
      </View>
      <View style={styles.actions}>
        <IconButton
          icon="bag-handle-outline"
          badge={count}
          onPress={() => router.navigate('/cart')}
          accessibilityLabel="Cart"
        />
        <IconButton icon="person-outline" onPress={() => router.push('/account')} accessibilityLabel="Account" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: HEADER_BRAND.left,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inline: {
    paddingHorizontal: HEADER_BRAND.left,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  background: {
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, height: HEADER_BRAND.rowHeight },
  brandText: { fontFamily: fonts.display, color: colors.white, fontSize: 22, letterSpacing: 3 },
  actions: { flexDirection: 'row', gap: 10 },
});
