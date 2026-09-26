import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { FOCUS_OPTIONS, GOAL_OPTIONS, planStore, savedPlans, type WorkoutPlan } from '@/services/workouts';

export function useSavedPlans() {
  return useSyncExternalStore(savedPlans.subscribe, savedPlans.get, savedPlans.get);
}

export function openSavedPlan(plan: WorkoutPlan) {
  planStore.set(plan);
  router.push({ pathname: '/workout-plan', params: { from: 'history' } });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "TODAY", "YESTERDAY", "TUE", or "SEP 12". */
export function planDay(iso: string) {
  const d = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diff = Math.floor((startOfToday.getTime() - new Date(d).setHours(0, 0, 0, 0)) / DAY_MS);
  if (diff <= 0) return 'TODAY';
  if (diff === 1) return 'YESTERDAY';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export function SessionRow({ plan }: { plan: WorkoutPlan }) {
  const goal = GOAL_OPTIONS.find((g) => g.key === plan.prefs.goal);
  const focus = FOCUS_OPTIONS.find((f) => f.key === plan.prefs.focus);
  const done = !!plan.completedAt;

  return (
    <PressableScale
      onPress={() => openSavedPlan(plan)}
      style={styles.row}
      scaleTo={0.98}
      accessibilityLabel={`Open ${plan.title}`}
    >
      <View style={styles.icon}>
        <Ionicons name={(goal?.icon ?? 'barbell') as keyof typeof Ionicons.glyphMap} size={17} color={colors.yellow} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {plan.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {planDay(plan.createdAt)} {'\u00B7'} {plan.minutes} MIN
          {focus ? ` \u00B7 ${focus.label.toUpperCase()}` : ''}
        </Text>
      </View>
      {done ? (
        <View style={styles.done}>
          <Ionicons name="checkmark" size={12} color={colors.black} />
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.mutedDark} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(254,219,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 17, lineHeight: 23 },
  meta: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 1.2, marginTop: 1 },
  done: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
