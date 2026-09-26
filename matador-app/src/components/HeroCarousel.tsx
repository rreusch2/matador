import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ProductArt } from '@/components/ProductArt';
import { PressableScale } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { colors, fonts, radius } from '@/constants/theme';
import { getProduct, type Category } from '@/data/products';

const AUTO_ADVANCE_MS = 5000;
const GAP = 12;

type Slide = {
  category: Category;
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  gradient: [string, string];
  light: boolean;
  logo: 'white' | 'yellow' | 'black';
  products: string[];
};

const SLIDES: Slide[] = [
  {
    category: 'energy',
    kicker: '4 FLAVORS \u00B7 2 FL OZ',
    title: 'ENERGY\nSHOTS',
    sub: '200mg clean caffeine.\nZero sugar. No crash.',
    cta: 'SHOP SHOTS',
    gradient: [colors.yellow, colors.yellowDeep],
    light: true,
    logo: 'black',
    products: ['blue-raze', 'original-charge', 'red-cape'],
  },
  {
    category: 'hydration',
    kicker: 'ELECTROLYTE STICKS',
    title: 'HYDRATION\nSTICKS',
    sub: '5x the electrolytes of a\nsports drink. 1g sugar.',
    cta: 'SHOP HYDRATION',
    gradient: ['#1E1E1E', '#0A0A0A'],
    light: false,
    logo: 'white',
    products: ['tropical-storm'],
  },
  {
    category: 'merch',
    kicker: 'DROP 01 \u00B7 LIVE NOW',
    title: 'MATADOR\nMERCH',
    sub: 'Heavyweight tees, caps\nand gear for the herd.',
    cta: 'SHOP MERCH',
    gradient: ['#111111', '#000000'],
    light: false,
    logo: 'yellow',
    products: ['charge-cap', 'horns-tee'],
  },
];

export function HeroCarousel() {
  const { width } = useWindowDimensions();
  const cardW = width - 40;
  const pageW = cardW + GAP;

  const ref = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  useAnimatedReaction(
    () => Math.round(x.value / pageW),
    (next, prev) => {
      if (next !== prev) scheduleOnRN(setIndex, next);
    },
    [pageW]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      const next = (index + 1) % SLIDES.length;
      ref.current?.scrollTo({ x: next * pageW, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [index, pageW]);

  return (
    <View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageW}
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}
      >
        {SLIDES.map((slide, i) => (
          <SlideCard key={slide.category} slide={slide} index={i} x={x} pageW={pageW} width={cardW} />
        ))}
      </Animated.ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <Dot key={s.category} index={i} x={x} pageW={pageW} />
        ))}
      </View>
    </View>
  );
}

function SlideCard({
  slide,
  index,
  x,
  pageW,
  width,
}: {
  slide: Slide;
  index: number;
  x: SharedValue<number>;
  pageW: number;
  width: number;
}) {
  const products = slide.products.map((id) => getProduct(id)!);
  const range = [(index - 1) * pageW, index * pageW, (index + 1) * pageW];

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, range, [70, 0, -70], Extrapolation.CLAMP) }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, range, [0.94, 1, 0.94], Extrapolation.CLAMP) }],
  }));

  const ink = slide.light ? colors.black : colors.white;
  const artH = width * 0.56;

  const sizeFor = (i: number) => {
    if (products.length === 3) return i === 1 ? artH : artH * 0.86;
    if (products.length === 1) return artH * 1.05;
    return artH * 1.05;
  };
  const overlapFor = (i: number) => {
    if (i === 0) return 0;
    return -sizeFor(i) * (products.length === 3 ? 0.58 : 0.4);
  };

  return (
    <Animated.View style={cardStyle}>
      <PressableScale
        onPress={() => router.navigate({ pathname: '/shop', params: { category: slide.category } })}
        scaleTo={0.98}
        style={[styles.card, { width }, !slide.light && styles.cardBordered]}
      >
        <LinearGradient colors={slide.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Logo
          color={slide.logo}
          width={width * 1.1}
          style={[styles.watermark, { opacity: slide.light ? 0.08 : 0.05 }]}
        />

        <View style={styles.copy}>
          <View style={[styles.kicker, { borderColor: slide.light ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.18)' }]}>
            <Text style={[styles.kickerText, { color: ink }]}>{slide.kicker}</Text>
          </View>
          <Text style={[styles.title, { color: ink }]}>{slide.title}</Text>
          <Text style={[styles.sub, { color: ink }]}>{slide.sub}</Text>
          <View style={[styles.cta, { backgroundColor: slide.light ? colors.black : colors.yellow }]}>
            <Text style={[styles.ctaText, { color: slide.light ? colors.yellow : colors.black }]}>{slide.cta}</Text>
            <Ionicons name="arrow-forward" size={16} color={slide.light ? colors.yellow : colors.black} />
          </View>
        </View>

        <Animated.View style={[styles.art, { height: artH, marginBottom: -artH * 0.1 }, artStyle]}>
          {products.map((p, i) => (
            <View key={p.id} style={{ marginLeft: overlapFor(i), zIndex: products.length === 3 && i === 1 ? 2 : 1 }}>
              <ProductArt product={p} size={sizeFor(i)} glow={!slide.light} />
            </View>
          ))}
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

function Dot({ index, x, pageW }: { index: number; x: SharedValue<number>; pageW: number }) {
  const style = useAnimatedStyle(() => {
    const range = [(index - 1) * pageW, index * pageW, (index + 1) * pageW];
    return {
      width: interpolate(x.value, range, [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(x.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  cardBordered: { borderWidth: 1, borderColor: colors.border },
  watermark: { position: 'absolute', right: '-35%', top: '8%', transform: [{ rotate: '-10deg' }] },
  copy: { padding: 24, paddingBottom: 0 },
  kicker: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
  },
  kickerText: { fontFamily: fonts.black, fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: fonts.display, fontSize: 52, lineHeight: 62, letterSpacing: 0.5 },
  sub: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, marginTop: 8, opacity: 0.7 },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 46,
    borderRadius: radius.pill,
  },
  ctaText: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1.5 },
  art: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.yellow },
});
