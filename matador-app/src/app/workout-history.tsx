import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SessionRow, useSavedPlans } from '@/components/SessionRow';
import { Button, PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { savedPlans, type WorkoutPlan } from '@/services/workouts';

const enter = (i: number) =>
  FadeInDown.delay(60 + Math.min(i, 10) * 40).duration(380).easing(Easing.out(Easing.cubic));

function groupByMonth(plans: WorkoutPlan[]) {
  const groups: { label: string; plans: WorkoutPlan[] }[] = [];
  for (const plan of plans) {
    const label = new Date(plan.createdAt)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      .toUpperCase();
    const last = groups[groups.length - 1];
    if (last?.label === label) last.plans.push(plan);
    else groups.push({ label, plans: [plan] });
  }
  return groups;
}

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { plans, loading, error } = useSavedPlans();
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    savedPlans.refresh();
  }, []);

  const pull = async () => {
    setPulling(true);
    await savedPlans.refresh({ force: true });
    setPulling(false);
  };

  const completed = plans?.filter((p) => p.completedAt).length ?? 0;
  let row = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={pull}
            tintColor={colors.yellow}
            colors={[colors.yellow]}
            progressViewOffset={insets.top + 60}
          />
        }
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.kicker}>YOUR LIBRARY</Text>
          <Text style={styles.title}>SESSIONS.</Text>
          {!!plans?.length && (
            <Text style={styles.count}>
              {plans.length} SAVED {'\u00B7'} {completed} COMPLETED
            </Text>
          )}
        </Animated.View>

        {!plans && loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.yellow} />
          </View>
        ) : !plans && error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedDark} />
            <Text style={styles.centerText}>{error}</Text>
            <Button label="TRY AGAIN" variant="outline" onPress={() => savedPlans.refresh({ force: true })} />
          </View>
        ) : !plans?.length ? (
          <View style={styles.center}>
            <Ionicons name="barbell-outline" size={36} color={colors.mutedDark} />
            <Text style={styles.centerText}>No sessions yet. Every workout you build is saved here.</Text>
            <Button label="BUILD ONE" onPress={() => router.back()} />
          </View>
        ) : (
          groupByMonth(plans).map((group) => (
            <View key={group.label} style={styles.group}>
              <Animated.Text entering={enter(row)} style={styles.groupLabel}>
                {group.label}
              </Animated.Text>
              <View style={{ gap: 8 }}>
                {group.plans.map((plan) => (
                  <Animated.View key={plan.id} entering={enter(row++)}>
                    <SessionRow plan={plan} />
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
        <Text style={styles.topTitle}>SAVED SESSIONS</Text>
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
