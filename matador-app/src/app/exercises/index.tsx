import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { listPopular, searchExercises, type LibraryExercise } from '@/services/exercises';
import { haptic } from '@/utils/haptics';

const enter = (i: number) =>
  FadeInDown.delay(40 + Math.min(i, 8) * 35).duration(360).easing(Easing.out(Easing.cubic));

const CARD_H = 184;

export default function ExerciseLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [popular, setPopular] = useState<LibraryExercise[] | null>(null);
  const [results, setResults] = useState<LibraryExercise[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardW = (width - 40 - 12) / 2;
  const searchingNow = query.trim().length >= 2;

  useEffect(() => {
    let cancelled = false;
    listPopular()
      .then((rows) => {
        if (!cancelled) setPopular(rows);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load exercises.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchExercises(term)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (!cancelled) setError('Search did not go through. Try again.');
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const open = (exercise: LibraryExercise) => {
    haptic.select();
    router.push(`/exercises/${exercise.slug}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.kicker}>LIBRARY</Text>
          <Text style={styles.title}>EXERCISES.</Text>
          <Text style={styles.lead}>Demos, muscles, and the gear each move uses.</Text>
        </Animated.View>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search bench, squat, pull up..."
            placeholderTextColor={colors.mutedDark}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            selectionColor={colors.yellow}
            cursorColor={colors.yellow}
            accessibilityLabel="Search exercises"
          />
          {!!query && (
            <PressableScale onPress={() => setQuery('')} scaleTo={0.9} accessibilityLabel="Clear search" hapticFeedback={false}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </PressableScale>
          )}
        </View>

        {error && !popular ? (
          <View style={styles.center}>
            <Text style={styles.empty}>{error}</Text>
          </View>
        ) : searchingNow ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{searching ? 'SEARCHING' : `${results?.length ?? 0} MATCHES`}</Text>
            {searching && !results ? (
              <ActivityIndicator color={colors.yellow} style={{ marginTop: 24 }} />
            ) : results?.length ? (
              <View style={{ gap: 8 }}>
                {results.map((exercise, index) => (
                  <Animated.View key={exercise.slug} entering={enter(index)}>
                    <ExerciseRow exercise={exercise} onPress={() => open(exercise)} />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>Nothing matches that. Try a shorter name, like squat or row.</Text>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>POPULAR</Text>
            {!popular ? (
              <ActivityIndicator color={colors.yellow} style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.grid}>
                {popular.map((exercise, index) => (
                  <Animated.View key={exercise.slug} entering={enter(index)} style={{ width: cardW, height: CARD_H }}>
                    <PressableScale
                      onPress={() => open(exercise)}
                      containerStyle={styles.cardSlot}
                      style={styles.card}
                      scaleTo={0.98}
                    >
                      <Text style={styles.cardTarget} numberOfLines={1}>
                        {(exercise.target ?? 'FULL BODY').toUpperCase()}
                      </Text>
                      <Text style={styles.cardName} numberOfLines={3}>
                        {exercise.name}
                      </Text>
                      <View style={styles.cardFoot}>
                        <Ionicons name="play" size={10} color={colors.yellow} />
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {exercise.equipment ?? 'Demo'}
                        </Text>
                      </View>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Back">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle}>EXERCISES</Text>
        <View style={{ width: 42 }} />
      </View>
    </View>
  );
}

function ExerciseRow({ exercise, onPress }: { exercise: LibraryExercise; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.row} scaleTo={0.98}>
      <View style={styles.rowIcon}>
        <Ionicons name="play" size={14} color={colors.yellow} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[exercise.target, exercise.equipment].filter(Boolean).join('  ·  ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedDark} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 2.5 },
  hero: { paddingHorizontal: 20 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 52, lineHeight: 66, marginTop: 2 },
  lead: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  search: {
    marginHorizontal: 20,
    marginTop: 18,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontFamily: fonts.medium, color: colors.white, fontSize: 15, paddingVertical: 0 },
  section: { marginTop: 26, paddingHorizontal: 20 },
  sectionLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardSlot: { flex: 1 },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  cardTarget: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 9, letterSpacing: 1.6 },
  cardName: { fontFamily: fonts.display, color: colors.white, fontSize: 22, lineHeight: 30, marginTop: 8 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  cardMeta: { flex: 1, fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(254,219,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontFamily: fonts.bold, color: colors.white, fontSize: 15 },
  rowMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  center: { paddingHorizontal: 20, paddingTop: 40 },
});
