import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { WORKOUT_TYPES } from '@/context/fitness';
import { FOCUS_OPTIONS } from '@/services/workouts';
import { WEEK_LETTERS, mondayIndex, programStore, useProgram } from '@/services/program';

export function ProgramCard() {
  const { program, loaded } = useProgram();

  useFocusEffect(
    useCallback(() => {
      programStore.refresh();
    }, [])
  );

  const today = mondayIndex();
  const todayPlan = program?.days[today];
  const trainDays = program?.days.filter((day) => !day.rest).length ?? 0;
  const typeLabel = WORKOUT_TYPES.find((item) => item.key === todayPlan?.type)?.label;
  const focusLabel = FOCUS_OPTIONS.find((item) => item.key === todayPlan?.focus)?.label;

  return (
    <PressableScale
      onPress={() => router.push('/program')}
      style={styles.card}
      scaleTo={0.98}
      accessibilityLabel="My program"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>THE WEEK</Text>
          <Text style={styles.title}>{(program?.name || 'MY PROGRAM').toUpperCase()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.yellow} />
      </View>

      {!loaded ? (
        <Text style={styles.sub}>Loading your week.</Text>
      ) : !program ? (
        <Text style={styles.sub}>Schedule rest days, training days, and what each one is.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={styles.week}>
            {WEEK_LETTERS.map((letter, index) => {
              const training = !program.days[index]?.rest;
              const isToday = index === today;
              return (
                <View key={`${letter}-${index}`} style={styles.dayCol}>
                  <View style={[styles.mark, training && styles.markOn, isToday && styles.markToday]}>
                    <Text style={[styles.markText, (training || isToday) && { color: colors.black }]}>{letter}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.sub}>
            {todayPlan?.rest
              ? 'Today is a rest day.'
              : `Today \u00B7 ${typeLabel ?? 'Train'}${focusLabel ? ` \u00B7 ${focusLabel}` : ''}${todayPlan?.minutes ? ` \u00B7 ${todayPlan.minutes} min` : ''}`}
          </Text>
          <Text style={styles.meta}>
            {trainDays} TRAINING {'\u00B7'} {7 - trainDays} REST
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2.5 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 36, marginTop: 2 },
  sub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: fonts.bold, color: colors.white, fontSize: 10, letterSpacing: 1.6 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1 },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { backgroundColor: colors.white, borderColor: colors.white },
  markToday: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  markText: { fontFamily: fonts.black, color: colors.muted, fontSize: 12 },
});
