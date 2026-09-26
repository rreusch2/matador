import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  WorkoutError,
  deletePlan,
  planStore,
  savedPlans,
  type WorkoutPlan,
} from '@/services/workouts';
import { haptic } from '@/utils/haptics';

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

function confirmDelete(title: string) {
  const message = `"${title}" will be removed from your library.`;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`Delete session?\n\n${message}`));
  return new Promise<boolean>((resolve) => {
    Alert.alert('Delete session?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function SessionRow({ plan }: { plan: WorkoutPlan }) {
  const goal = GOAL_OPTIONS.find((g) => g.key === plan.prefs.goal);
  const focus = FOCUS_OPTIONS.find((f) => f.key === plan.prefs.focus);
  const done = !!plan.completedAt;
  const [removing, setRemoving] = useState(false);

  const onDelete = async () => {
    if (removing) return;
    haptic.medium();
    const ok = await confirmDelete(plan.title);
    if (!ok) return;
    setRemoving(true);
    try {
      await deletePlan(plan.id);
      haptic.success();
    } catch (e) {
      haptic.error();
      const message = e instanceof WorkoutError ? e.message : 'Could not delete that session.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Could not delete', message);
      setRemoving(false);
    }
  };

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={() => openSavedPlan(plan)}
        containerStyle={styles.main}
        style={styles.mainInner}
        scaleTo={0.98}
        disabled={removing}
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
      <Pressable
        onPress={onDelete}
        disabled={removing}
        hitSlop={8}
        style={styles.delete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${plan.title}`}
      >
        {removing ? (
          <ActivityIndicator size="small" color={colors.muted} />
        ) : (
          <Ionicons name="trash-outline" size={16} color={colors.mutedDark} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  main: { flex: 1 },
  mainInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  delete: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
