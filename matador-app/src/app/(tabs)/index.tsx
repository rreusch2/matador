import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { HeroCarousel } from '@/components/HeroCarousel';
import { Marquee } from '@/components/Marquee';
import { ProductArt } from '@/components/ProductArt';
import { ProductCard } from '@/components/ProductCard';
import { PressableScale, Reveal, SectionHeader } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { useFitness } from '@/context/fitness';
import { getProduct, products, type Category } from '@/data/products';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const goShop = (category?: Category) =>
  router.navigate({ pathname: '/shop', params: category ? { category } : {} });

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

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
        <Reveal style={{ paddingTop: insets.top + 68, paddingHorizontal: 20 }}>
          <TodayCard />
        </Reveal>

        <Reveal delay={120} style={{ marginTop: 32 }}>
          <SectionHeader kicker="FOR THE SESSION" title="FUEL UP" />
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
            items={['TRAIN', 'FUEL', 'RECOVER', 'REPEAT', 'OWN THE ARENA']}
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

      <BrandHeader scrollY={scrollY} />
    </View>
  );
}

function TodayCard() {
  const { week, weekMinutes, streak } = useFitness();
  const today = week[week.length - 1];
  const trained = today.minutes > 0;
  const max = Math.max(30, ...week.map((day) => day.minutes));

  return (
    <View style={styles.today}>
      <View style={styles.todayTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.todayKicker}>{trained ? 'LOGGED TODAY' : 'TODAY'}</Text>
          <Text style={styles.todayTitle}>{trained ? today.minutes : 'TRAIN.'}</Text>
          <Text style={styles.todayUnit}>{trained ? 'MIN TODAY' : 'NO SESSION YET'}</Text>
        </View>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={14} color={colors.black} />
          <Text style={styles.streakText}>{streak}</Text>
          <Text style={styles.streakUnit}>{streak === 1 ? 'DAY' : 'DAYS'}</Text>
        </View>
      </View>

      <View style={styles.week}>
        {week.map((day, i) => {
          const isToday = i === week.length - 1;
          const pct = day.minutes / max;
          return (
            <View key={day.day} style={styles.weekCol}>
              <View style={styles.weekTrack}>
                <View
                  style={[
                    styles.weekBar,
                    {
                      height: `${Math.max(pct, isToday ? 0.12 : 0) * 100}%`,
                      backgroundColor: isToday ? colors.yellow : day.minutes > 0 ? colors.white : 'transparent',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.weekLabel, isToday && { color: colors.yellow }]}>
                {DAY_LETTERS[new Date(day.day).getDay()]}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.weekMeta}>{weekMinutes} MIN THIS WEEK</Text>

      <View style={styles.todayActions}>
        <PressableScale
          onPress={() => router.navigate('/train')}
          containerStyle={styles.actionSlot}
          style={styles.trainBtn}
          scaleTo={0.98}
          accessibilityLabel="Open Train"
        >
          <Ionicons name="barbell" size={16} color={colors.black} />
          <Text style={styles.trainBtnText}>TRAIN</Text>
        </PressableScale>
        <PressableScale
          onPress={() => goShop()}
          containerStyle={styles.actionSlot}
          style={styles.shopBtn}
          scaleTo={0.98}
          accessibilityLabel="Open Shop"
        >
          <Ionicons name="bag-handle-outline" size={16} color={colors.white} />
          <Text style={styles.shopBtnText}>SHOP</Text>
        </PressableScale>
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
  today: {
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  todayKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2.5 },
  todayTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 48, lineHeight: 60, marginTop: 2 },
  todayUnit: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 1.8, marginTop: -4 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
  },
  streakText: { fontFamily: fonts.black, color: colors.black, fontSize: 14 },
  streakUnit: { fontFamily: fonts.black, color: colors.black, fontSize: 9, letterSpacing: 0.6 },
  week: { flexDirection: 'row', gap: 6, height: 72, marginTop: 16 },
  weekCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekTrack: {
    flex: 1,
    width: 16,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 6,
    overflow: 'hidden',
  },
  weekBar: { width: '100%' },
  weekLabel: { fontFamily: fonts.black, color: colors.muted, fontSize: 9 },
  weekMeta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 1.6, marginTop: 10 },
  todayActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionSlot: { flex: 1 },
  trainBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trainBtnText: { fontFamily: fonts.black, color: colors.black, fontSize: 13, letterSpacing: 1.6 },
  shopBtn: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shopBtnText: { fontFamily: fonts.black, color: colors.white, fontSize: 13, letterSpacing: 1.6 },
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
