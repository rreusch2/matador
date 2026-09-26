import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useFitness } from '@/context/fitness';
import { faceGoal, goalStore, useGoals, type GoalKind } from '@/services/goals';

const ADD: { kind: GoalKind; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }[] = [
  { kind: 'sessions', icon: 'calendar-outline', label: '4 DAYS', sub: 'A WEEK' },
  { kind: 'weight', icon: 'body-outline', label: 'WEIGHT', sub: 'BY A DATE' },
  { kind: 'lift', icon: 'barbell-outline', label: 'A LIFT', sub: 'OR A MOVE' },
  { kind: 'event', icon: 'flag-outline', label: 'A DATE', sub: 'TO TRAIN FOR' },
];

function open(kind?: GoalKind) {
  router.push(kind ? { pathname: '/goals', params: { add: kind } } : '/goals');
}

export function GoalsCard() {
  const { goals, weighIns, error } = useGoals();
  const { week } = useFitness();
  const activeDays = week.filter((day) => day.minutes > 0).length;

  useFocusEffect(
    useCallback(() => {
      goalStore.refresh();
    }, [])
  );

  const loaded = goals !== null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>YOUR AIM</Text>
          <Text style={styles.title}>GOALS</Text>
        </View>
        {loaded && goals.length > 0 && (
          <PressableScale onPress={() => open()} style={styles.manage} scaleTo={0.94} accessibilityLabel="Manage goals">
            <Text style={styles.manageText}>MANAGE</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.yellow} />
          </PressableScale>
        )}
      </View>

      {!loaded ? (
        <Text style={styles.hint}>{error ?? 'Loading your goals.'}</Text>
      ) : goals.length === 0 ? (
        <View>
          <Text style={styles.lead}>Pick what this stretch of training is for.</Text>
          <View style={{ gap: 8 }}>
            {[ADD.slice(0, 2), ADD.slice(2)].map((row) => (
              <View key={row[0].kind} style={styles.gridRow}>
                {row.map((item) => (
                  <PressableScale
                    key={item.kind}
                    onPress={() => open(item.kind)}
                    containerStyle={styles.tileSlot}
                    style={styles.tile}
                    scaleTo={0.98}
                    accessibilityLabel={
                  item.kind === 'sessions'
                    ? 'Set a days per week goal'
                    : item.kind === 'weight'
                      ? 'Set a weight goal'
                      : item.kind === 'lift'
                        ? 'Set a lift goal'
                        : 'Set a date goal'
                }
                  >
                    <Ionicons name={item.icon} size={18} color={colors.yellow} />
                    <Text style={styles.tileLabel}>{item.label}</Text>
                    <Text style={styles.tileSub}>{item.sub}</Text>
                  </PressableScale>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {goals.map((goal) => {
            const face = faceGoal(goal, weighIns, activeDays);
            return (
              <PressableScale
                key={goal.id}
                onPress={() => open()}
                style={styles.goal}
                scaleTo={0.99}
                accessibilityLabel={face.title}
              >
                <View style={styles.goalTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalKicker}>{face.kicker}</Text>
                    <Text style={styles.goalTitle} numberOfLines={2}>
                      {face.title}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{face.stat}</Text>
                    {face.statUnit ? <Text style={styles.statUnit}>{face.statUnit}</Text> : null}
                  </View>
                </View>
                {face.pct != null ? <Meter pct={face.pct} /> : null}
                <Text style={styles.hint}>{face.hint}</Text>
              </PressableScale>
            );
          })}
          <PressableScale onPress={() => open()} style={styles.add} scaleTo={0.98} accessibilityLabel="Add another goal">
            <Ionicons name="add" size={16} color={colors.yellow} />
            <Text style={styles.addText}>ADD ANOTHER</Text>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

function Meter({ pct }: { pct: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(Math.min(1, Math.max(0, pct)), { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [pct, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
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
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2.5 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 36, marginTop: 2 },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 12,
    paddingRight: 8,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(254,219,0,0.35)',
  },
  manageText: { fontFamily: fonts.black, color: colors.yellow, fontSize: 10, letterSpacing: 1.5 },
  lead: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  gridRow: { flexDirection: 'row', gap: 8 },
  tileSlot: { flex: 1 },
  tile: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  tileLabel: { fontFamily: fonts.black, color: colors.white, fontSize: 13, letterSpacing: 1.2, marginTop: 6 },
  tileSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 1.2 },
  goal: { gap: 8 },
  goalTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  goalKicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.6 },
  goalTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 26, lineHeight: 32, marginTop: 2 },
  stat: { alignItems: 'flex-end' },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 34 },
  statUnit: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.4, marginTop: -2 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.yellow },
  hint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, lineHeight: 18 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
  },
  addText: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 1.4 },
});
