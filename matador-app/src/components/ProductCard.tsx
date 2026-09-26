import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { ProductArt } from '@/components/ProductArt';
import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useCart } from '@/context/cart';
import { formatPrice, type Product } from '@/data/products';
import { haptic } from '@/utils/haptics';

export function defaultVariant(product: Product) {
  return product.packs?.[0]?.label ?? product.sizes?.[Math.min(1, (product.sizes?.length ?? 1) - 1)];
}

export function ProductCard({ product, width }: { product: Product; width: number }) {
  const { add, favorites, toggleFavorite } = useCart();
  const fav = favorites.includes(product.id);
  const [added, setAdded] = useState(false);
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const quickAdd = () => {
    add(product, { variant: defaultVariant(product), unitPrice: product.price, quantity: 1 });
    haptic.success();
    pop.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1));
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      style={[styles.card, { width }]}
      scaleTo={0.97}
      accessibilityRole="none"
      accessibilityLabel={product.name}
    >
      <LinearGradient
        colors={[`${product.gradient[1]}40`, colors.surface]}
        style={[styles.artWrap, { height: width * 0.95 }]}
      >
        <ProductArt product={product} size={width * 0.82} />
        {product.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        )}
        <View style={styles.heartSlot}>
          <PressableScale
            onPress={() => toggleFavorite(product.id)}
            style={styles.heart}
            scaleTo={0.8}
            accessibilityLabel="Favorite"
          >
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? colors.yellow : colors.white} />
          </PressableScale>
        </View>
      </LinearGradient>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.flavor} numberOfLines={1}>
          {product.flavor}
        </Text>
        <View style={styles.row}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <PressableScale onPress={quickAdd} scaleTo={0.85} hapticFeedback={false} accessibilityLabel="Quick add">
            <Animated.View style={[styles.add, added && { backgroundColor: colors.white }, popStyle]}>
              <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={colors.black} />
            </Animated.View>
          </PressableScale>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  artWrap: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontFamily: fonts.black, fontSize: 9, letterSpacing: 1, color: colors.black },
  heartSlot: { position: 'absolute', top: 8, right: 8 },
  heart: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 14, paddingTop: 10 },
  name: { fontFamily: fonts.bold, color: colors.white, fontSize: 15 },
  flavor: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  price: { fontFamily: fonts.display, color: colors.white, fontSize: 20, letterSpacing: 0.5 },
  add: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
