import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductArt } from '@/components/ProductArt';
import { ProductCard } from '@/components/ProductCard';
import { Button, IconButton, PressableScale, SectionHeader, Stepper } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useCart } from '@/context/cart';
import { formatPrice, getProduct, products } from '@/data/products';
import { haptic } from '@/utils/haptics';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProduct(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { add, count, favorites, toggleFavorite } = useCart();

  const options = product?.packs?.map((p) => p.label) ?? product?.sizes ?? [];
  const [option, setOption] = useState(options[Math.min(1, options.length - 1)] ?? options[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const scrollY = useSharedValue(0);
  const bob = useSharedValue(0);
  const spin = useSharedValue(0);
  const buttonPop = useSharedValue(1);

  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: scrollY.value * 0.45 + bob.value * -12 },
      { scale: interpolate(scrollY.value, [-200, 0, 300], [1.25, 1, 0.8]) },
      { rotate: `${spin.value}deg` },
    ],
    opacity: interpolate(scrollY.value, [0, 320], [1, 0.2]),
  }));

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonPop.value }] }));

  if (!product) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.name}>PRODUCT NOT FOUND</Text>
        <Button label="BACK TO SHOP" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const pack = product.packs?.find((p) => p.label === option);
  const unitPrice = pack ? +(product.price * pack.multiplier).toFixed(2) : product.price;
  const savings = pack && pack.multiplier > 1 ? Math.round((1 - pack.multiplier / (pack.count / product.packs![0].count)) * 100) : 0;
  const fav = favorites.includes(product.id);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id);
  const heroH = Math.min(width * 1.05, 460) + insets.top;

  const onAdd = () => {
    add(product, { variant: option, unitPrice, quantity: qty });
    haptic.success();
    buttonPop.value = withSequence(withSpring(1.06, { damping: 8, stiffness: 400 }), withSpring(1));
    spin.value = withSequence(withTiming(-8, { duration: 120 }), withSpring(0, { damping: 6 }));
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View style={{ height: heroH, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <LinearGradient
            colors={[`${product.gradient[1]}66`, `${product.gradient[1]}14`, colors.black]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.bgWord, { top: insets.top + 60 }]} numberOfLines={1}>
            {product.name.split(' ')[0].toUpperCase()}
          </Text>
          <Animated.View style={artStyle}>
            <ProductArt product={product} size={Math.min(width * 0.9, 400)} />
          </Animated.View>
        </View>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(80).duration(420).easing(Easing.out(Easing.cubic))}>
            <View style={styles.metaRow}>
              <Text style={styles.category}>{product.category.toUpperCase()}</Text>
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color={colors.yellow} />
                <Text style={styles.ratingText}>
                  {product.rating} <Text style={{ color: colors.mutedDark }}>({product.reviews.toLocaleString()})</Text>
                </Text>
              </View>
            </View>
            <Text style={styles.name}>{product.name.toUpperCase()}</Text>
            <Text style={styles.tagline}>{product.tagline}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(unitPrice)}</Text>
              {pack && <Text style={styles.per}>{formatPrice(unitPrice / pack.count)} / {product.category === 'energy' ? 'shot' : 'stick'}</Text>}
              {savings > 0 && (
                <View style={styles.save}>
                  <Text style={styles.saveText}>SAVE {savings}%</Text>
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(420).easing(Easing.out(Easing.cubic))} style={styles.stats}>
            {product.stats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {options.length > 1 && (
            <Animated.View entering={FadeInDown.delay(240).duration(420).easing(Easing.out(Easing.cubic))}>
              <Text style={styles.label}>{product.packs ? 'PACK SIZE' : 'SIZE'}</Text>
              <View style={styles.options}>
                {options.map((o) => {
                  const active = o === option;
                  return (
                    <Pressable
                      key={o}
                      onPress={() => {
                        haptic.select();
                        setOption(o);
                      }}
                      style={[styles.option, product.packs && { flex: 1 }, active && styles.optionActive]}
                    >
                      <Text style={[styles.optionText, active && { color: colors.black }]}>{o}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(320).duration(420).easing(Easing.out(Easing.cubic))}>
            <Text style={styles.label}>THE STORY</Text>
            <Text style={styles.description}>{product.description}</Text>

            {product.ingredients && (
              <>
                <Text style={styles.label}>WHAT'S INSIDE</Text>
                <View style={styles.ingredients}>
                  {product.ingredients.map((i) => (
                    <View key={i} style={styles.ingredient}>
                      <Ionicons name="flash" size={11} color={colors.yellow} />
                      <Text style={styles.ingredientText}>{i}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.perks}>
              {[
                ['rocket-outline', 'Free shipping $50+'],
                ['refresh-outline', '30-day guarantee'],
                ['leaf-outline', 'Clean ingredients'],
              ].map(([icon, text]) => (
                <View key={text} style={styles.perk}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.yellow} />
                  <Text style={styles.perkText}>{text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {related.length > 0 && (
          <View style={{ marginTop: 36 }}>
            <SectionHeader kicker="KEEP CHARGING" title="YOU MIGHT ALSO LIKE" />
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
              {related.map((p) => (
                <ProductCard key={p.id} product={p} width={170} />
              ))}
            </Animated.ScrollView>
          </View>
        )}
      </Animated.ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-down" onPress={() => router.back()} style={styles.topBtn} accessibilityLabel="Close" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconButton
            icon={fav ? 'heart' : 'heart-outline'}
            color={fav ? colors.yellow : colors.white}
            onPress={() => toggleFavorite(product.id)}
            style={styles.topBtn}
            accessibilityLabel="Favorite"
          />
          <IconButton
            icon="bag-handle-outline"
            badge={count}
            onPress={() => router.navigate('/cart')}
            style={styles.topBtn}
            accessibilityLabel="Cart"
          />
        </View>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)', colors.black]}
        locations={[0, 0.3, 1]}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Stepper value={qty} onChange={setQty} />
        <Animated.View style={[{ flex: 1 }, popStyle]}>
          <PressableScale onPress={onAdd} hapticFeedback={false} style={[styles.addBtn, added && { backgroundColor: colors.white }]}>
            <Ionicons name={added ? 'checkmark-circle' : 'bag-add'} size={18} color={colors.black} />
            <Text style={styles.addText}>{added ? 'ADDED TO CART' : `ADD \u00B7 ${formatPrice(unitPrice * qty)}`}</Text>
          </PressableScale>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  bgWord: {
    position: 'absolute',
    fontFamily: fonts.display,
    fontSize: 160,
    color: 'rgba(255,255,255,0.05)',
    letterSpacing: 4,
  },
  body: { paddingHorizontal: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: fonts.bold, color: colors.white, fontSize: 12 },
  name: { fontFamily: fonts.display, color: colors.white, fontSize: 48, lineHeight: 62, marginTop: 6 },
  tagline: { fontFamily: fonts.medium, color: colors.muted, fontSize: 16, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  price: { fontFamily: fonts.display, color: colors.white, fontSize: 32 },
  per: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 13 },
  save: { backgroundColor: colors.yellowSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  saveText: { fontFamily: fonts.black, color: colors.yellow, fontSize: 10, letterSpacing: 1 },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 22 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  label: {
    fontFamily: fonts.black,
    color: colors.white,
    fontSize: 12,
    letterSpacing: 2.5,
    marginTop: 26,
    marginBottom: 12,
  },
  options: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: {
    minWidth: 54,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  optionText: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1 },
  description: { fontFamily: fonts.regular, color: '#BDBDBD', fontSize: 15, lineHeight: 24 },
  ingredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 12 },
  perks: {
    flexDirection: 'row',
    marginTop: 26,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
  },
  perk: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  perkText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 10, textAlign: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBtn: { backgroundColor: 'rgba(0,0,0,0.45)' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { fontFamily: fonts.black, color: colors.black, fontSize: 14, letterSpacing: 1.2 },
});
