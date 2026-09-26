import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroCarousel } from '@/components/HeroCarousel';
import { Marquee } from '@/components/Marquee';
import { ProductArt } from '@/components/ProductArt';
import { ProductCard } from '@/components/ProductCard';
import { IconButton, PressableScale, Reveal, SectionHeader } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { HEADER_BRAND, TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { useCart } from '@/context/cart';
import { getProduct, products, type Category } from '@/data/products';

const goShop = (category?: Category) =>
  router.navigate({ pathname: '/shop', params: category ? { category } : {} });

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { count } = useCart();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const headerBg = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP),
  }));

  const favorites = products.filter((p) => p.badge === 'BEST SELLER' || p.badge === 'NEW' || p.badge === 'EXTRA');
  const cardW = Math.min(190, width * 0.46);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40 }}
      >
        <Reveal style={{ paddingTop: insets.top + 68 }}>
          <HeroCarousel />
        </Reveal>

        <Reveal delay={350} style={styles.stats}>
          {[
            ['200MG', 'CLEAN CAFFEINE'],
            ['0G', 'SUGAR'],
            ['5X', 'ELECTROLYTES'],
          ].map(([value, label], i) => (
            <View key={label} style={[styles.stat, i > 0 && styles.statDivider]}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </Reveal>

        <Reveal delay={450} style={styles.marquees}>
          <Marquee
            items={['BLACK', 'WHITE', 'GOLD', 'MATADOR', 'OWN THE ARENA']}
            background={colors.white}
            color={colors.black}
            rotate={3}
            reverse
            speed={30}
            style={{ position: 'absolute', left: 0, right: 0, top: 22 }}
          />
          <Marquee
            items={['ZERO SUGAR', 'NO CRASH', '200MG CAFFEINE', '5X ELECTROLYTES', 'FUEL THE CHARGE']}
            background={colors.yellow}
            color={colors.black}
            rotate={-3}
            style={{ position: 'absolute', left: 0, right: 0, top: 22 }}
          />
        </Reveal>

        <Reveal delay={550}>
          <SectionHeader kicker="PICK YOUR WEAPON" title="SHOP BY CATEGORY" />
          <CategoryGrid />
        </Reveal>

        <Reveal delay={650} style={{ marginTop: 40 }}>
          <SectionHeader kicker="THE HERD'S PICKS" title="FAN FAVORITES" action="SEE ALL" onAction={() => goShop()} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            decelerationRate="fast"
            snapToInterval={cardW + 14}
          >
            {favorites.map((p) => (
              <ProductCard key={p.id} product={p} width={cardW} />
            ))}
          </ScrollView>
        </Reveal>

        <View style={styles.footer}>
          <Logo width={56} style={{ opacity: 0.25 }} />
          <Text style={styles.footerBrand}>MATADOR</Text>
          <Text style={styles.footerText}>{'\u00A9'} {new Date().getFullYear()} MATADOR ENERGY</Text>
        </View>
      </Animated.ScrollView>

      <View style={[styles.header, { paddingTop: insets.top + HEADER_BRAND.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.headerBg, headerBg]} />
        <View style={styles.brand}>
          <Logo width={HEADER_BRAND.logoWidth} color="yellow" />
          <Text style={styles.brandText}>MATADOR</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconButton icon="bag-handle-outline" badge={count} onPress={() => router.navigate('/cart')} accessibilityLabel="Cart" />
          <IconButton icon="person-outline" onPress={() => router.push('/account')} accessibilityLabel="Account" />
        </View>
      </View>
    </View>
  );
}

function CategoryGrid() {
  const { width } = useWindowDimensions();
  const half = (width - 40 - 12) / 2;
  const energy = getProduct('blue-raze')!;
  const hydration = getProduct('tropical-storm')!;
  const merch = getProduct('horns-tee')!;

  return (
    <View style={{ paddingHorizontal: 20, gap: 12 }}>
      <PressableScale onPress={() => goShop('energy')} style={styles.catLarge} scaleTo={0.98}>
        <LinearGradient
          colors={[colors.yellow, colors.yellowDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1, justifyContent: 'space-between', padding: 20 }}>
          <View>
            <Text style={[styles.catKicker, { color: 'rgba(0,0,0,0.6)' }]}>4 FLAVORS {'\u00B7'} 2 FL OZ</Text>
            <Text style={[styles.catTitle, { color: colors.black, fontSize: 40, lineHeight: 46 }]}>ENERGY{'\n'}SHOTS</Text>
          </View>
          <View style={styles.catArrowDark}>
            <Ionicons name="arrow-forward" size={18} color={colors.yellow} />
          </View>
        </View>
        <View style={{ position: 'absolute', right: -10, bottom: -20 }}>
          <ProductArt product={energy} size={210} glow={false} />
        </View>
      </PressableScale>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { cat: 'hydration' as const, title: 'HYDRATION', kicker: '5X ELECTROLYTES', product: hydration },
          { cat: 'merch' as const, title: 'MERCH', kicker: 'DROP 01 \u00B7 LIVE', product: merch },
        ].map((c) => (
          <PressableScale
            key={c.cat}
            onPress={() => goShop(c.cat)}
            style={[styles.catSmall, { width: half, height: half * 0.82 + 70 }]}
            scaleTo={0.97}
          >
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <ProductArt product={c.product} size={half * 0.82} />
            </View>
            <View style={{ padding: 14, paddingTop: 0 }}>
              <Text style={styles.catKicker} numberOfLines={1}>{c.kicker}</Text>
              <Text style={styles.catTitle}>{c.title}</Text>
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: HEADER_BRAND.left,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBg: {
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, height: HEADER_BRAND.rowHeight },
  brandText: { fontFamily: fonts.display, color: colors.white, fontSize: 22, letterSpacing: 3 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 28 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  marquees: { height: 100, marginVertical: 30 },
  catLarge: {
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  catSmall: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  catKicker: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.5, color: colors.muted },
  catTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 26, lineHeight: 34, marginTop: 2 },
  catArrowDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { alignItems: 'center', marginTop: 50, gap: 6 },
  footerBrand: { fontFamily: fonts.display, color: colors.mutedDark, fontSize: 20, letterSpacing: 6, marginTop: 6 },
  footerText: { fontFamily: fonts.bold, color: colors.mutedDark, fontSize: 10, letterSpacing: 2 },
});
