import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivitySession } from '@/components/ActivitySession';
import { Button, PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useFitness, type Workout } from '@/context/fitness';

const enter = (i: number) =>
  FadeInDown.delay(60 + Math.min(i, 10) * 40).duration(380).easing(Easing.out(Easing.cubic));

function groupByMonth(workouts: Workout[]) {
  const groups: { label: string; workouts: Workout[] }[] = [];
  const sorted = [...workouts].sort((a, b) => b.at - a.at);
  for (const workout of sorted) {
    const label = new Date(workout.at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    const last = groups[groups.length - 1];
    if (last?.label === label) last.workouts.push(workout);
    else groups.push({ label, workouts: [workout] });
  }
  return groups;
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { workouts, loaded, removeWorkout } = useFitness();
  const minutes = workouts.reduce((sum, workout) => sum + workout.minutes, 0);
  let row = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40, flexGrow: 1 }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.kicker}>YOUR LOG</Text>
          <Text style={styles.title}>ACTIVITY.</Text>
          {loaded && workouts.length > 0 && (
            <Text style={styles.count}>
              {workouts.length} {workouts.length === 1 ? 'SESSION' : 'SESSIONS'} {'\u00B7'} {minutes} MIN
            </Text>
          )}
        </Animated.View>

        {!loaded ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.yellow} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="flame-outline" size={36} color={colors.mutedDark} />
            <Text style={styles.centerText}>No sessions yet. Log a workout and it will show up here.</Text>
            <Button label="BACK TO TRAIN" onPress={() => router.back()} />
          </View>
        ) : (
          groupByMonth(workouts).map((group) => (
            <View key={group.label} style={styles.group}>
              <Animated.Text entering={enter(row)} style={styles.groupLabel}>
                {group.label}
              </Animated.Text>
              <View style={{ gap: 8 }}>
                {group.workouts.map((workout) => (
                  <Animated.View key={workout.id} entering={enter(row++)}>
                    <ActivitySession workout={workout} onRemove={() => removeWorkout(workout.id)} />
                  </Animated.View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Back">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle}>ACTIVITY</Text>
        <View style={{ width: 42 }} />
      </View>
    </View>
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

  hero: { paddingHorizontal: 20, marginBottom: 8 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 56, lineHeight: 72, marginTop: 2 },
  count: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 2 },

  group: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupLabel: {
    fontFamily: fonts.black,
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 12,
    paddingLeft: 2,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40, paddingBottom: 60 },
  centerText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
