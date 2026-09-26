import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { Reveal } from '@/components/ui';
import { TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { categories, products, type Category } from '@/data/products';
import { haptic } from '@/utils/haptics';

type Filter = 'all' | Category;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  ...categories.map((c) => ({ key: c.key as Filter, label: c.label.toUpperCase() })),
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: Category }>();
  const [filter, setFilter] = useState<Filter>(params.category ?? 'all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (params.category) setFilter(params.category);
  }, [params.category]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (filter === 'all' || p.category === filter) &&
        (!q || `${p.name} ${p.flavor} ${p.category}`.toLowerCase().includes(q))
    );
  }, [filter, query]);

  const gap = 12;
  const cardW = (width - 40 - gap) / 2;

  return (
    <View style={styles.screen}>
      <FlatList
        data={data}
        key="grid"
        numColumns={2}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={{ gap, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 16 }}>
            <Reveal style={{ paddingHorizontal: 20 }}>
              <Text style={styles.kicker}>MATADOR STORE</Text>
              <Text style={styles.title}>GEAR UP.</Text>
            </Reveal>

            <Reveal delay={60} style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={'Search shots, sticks, merch\u2026'}
                placeholderTextColor={colors.mutedDark}
                style={styles.input}
                returnKeyType="search"
              />
              {!!query && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              )}
            </Reveal>

            <Reveal delay={120}>
              <FlatList
                horizontal
                data={FILTERS}
                keyExtractor={(f) => f.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                style={{ marginBottom: 18 }}
                renderItem={({ item }) => {
                  const active = item.key === filter;
                  return (
                    <Pressable
                      onPress={() => {
                        haptic.select();
                        setFilter(item.key);
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && { color: colors.black }]}>{item.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </Reveal>

            <Text style={styles.count}>
              {data.length} {data.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color={colors.mutedDark} />
            <Text style={styles.emptyText}>No matches for {'\u201C'}{query}{'\u201D'}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay((index % 6) * 50)
              .duration(380)
              .easing(Easing.out(Easing.cubic))}
            layout={LinearTransition.duration(260).easing(Easing.out(Easing.cubic))}
          >
            <ProductCard product={item} width={cardW} />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 56, lineHeight: 72, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.white, fontFamily: fonts.medium, fontSize: 15, height: '100%' },
  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  chipText: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 1.2 },
  count: {
    fontFamily: fonts.bold,
    color: colors.mutedDark,
    fontSize: 11,
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 14 },
});
