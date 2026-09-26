import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseVideo } from '@/components/ExerciseVideo';
import { Button, PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { getExercise, type LibraryExercise } from '@/services/exercises';

export default function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [exercise, setExercise] = useState<LibraryExercise | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setExercise(null);
    setMissing(false);
    setFailed(false);
    getExercise(slug)
      .then((row) => {
        if (cancelled) return;
        if (!row) setMissing(true);
        else setExercise(row);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const videoW = Math.min(width - 40, 520);
  const videoH = Math.max(204, Math.round((videoW * 9) / 16));
  const videoId = exercise?.videoId ?? null;

  const facts = exercise
    ? [
        ['LEVEL', label(exercise.level ?? exercise.difficulty)],
        ['TARGET', exercise.target],
        ['PRIME MOVER', exercise.primeMover],
        ['ALSO WORKS', exercise.secondary.join(', ')],
        ['EQUIPMENT', [exercise.equipment, exercise.secondaryEquipment].filter(Boolean).join(' \u00B7 ')],
        ['PATTERN', exercise.pattern],
        ['MECHANICS', exercise.mechanics],
        ['REGION', exercise.region],
        ['STYLE', exercise.classification],
      ].filter((pair): pair is [string, string] => !!pair[1])
    : [];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 48 }}
      >
        {!exercise && !missing ? (
          <ActivityIndicator color={colors.yellow} style={{ marginTop: 80 }} />
        ) : missing || !exercise ? (
          <View style={styles.missing}>
            <Text style={styles.missingText}>That exercise is not in the library.</Text>
            <Button label="BACK" variant="outline" onPress={() => router.back()} />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(320)}>
            <View style={styles.hero}>
              <Text style={styles.kicker}>{(exercise.target ?? 'EXERCISE').toUpperCase()}</Text>
              <Text style={styles.title}>{exercise.name.toUpperCase()}</Text>
            </View>

            <View style={styles.videoWrap}>
              {videoId && !failed ? (
                <ExerciseVideo
                  videoId={videoId}
                  width={videoW}
                  height={videoH}
                  play
                  onError={() => setFailed(true)}
                />
              ) : (
                <View style={[styles.noVideo, { width: videoW, height: videoH }]}>
                  <Ionicons name="videocam-off-outline" size={28} color={colors.mutedDark} />
                  <Text style={styles.noVideoText}>No demo for this one.</Text>
                </View>
              )}
            </View>

            <View style={styles.facts}>
              {facts.map(([labelText, value], index) => (
                <Animated.View key={labelText} entering={FadeInDown.delay(index * 30).duration(280).easing(Easing.out(Easing.cubic))}>
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>{labelText}</Text>
                    <Text style={styles.factValue}>{value}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle} numberOfLines={1}>
          {exercise?.name.toUpperCase() ?? 'EXERCISE'}
        </Text>
        <View style={{ width: 42 }} />
      </View>
    </View>
  );
}

function label(value: string | null) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  topTitle: { flex: 1, fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1.4, textAlign: 'center' },
  hero: { paddingHorizontal: 20 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 40, lineHeight: 50, marginTop: 4 },
  videoWrap: { alignItems: 'center', marginTop: 18 },
  noVideo: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noVideoText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  facts: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fact: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  factLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.6 },
  factValue: { fontFamily: fonts.semibold, color: colors.white, fontSize: 15, lineHeight: 20 },
  missing: { alignItems: 'center', gap: 16, paddingHorizontal: 32, paddingTop: 80 },
  missingText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 15, textAlign: 'center' },
});
