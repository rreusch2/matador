import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivitySession } from '@/components/ActivitySession';
import { Logo } from '@/components/Logo';
import { SessionRow, useSavedPlans } from '@/components/SessionRow';
import { Button, PressableScale, Reveal } from '@/components/ui';
import { WorkoutBuilderCard } from '@/components/WorkoutBuilderCard';
import { TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { WORKOUT_TYPES, useFitness, type WorkoutType } from '@/context/fitness';
import { savedPlans } from '@/services/workouts';
import { haptic } from '@/utils/haptics';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const [logOpen, setLogOpen] = useState(false);
  const today = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40 }}
      >
        <Reveal style={{ paddingHorizontal: 20 }}>
          <Text style={styles.kicker}>MATADOR PERFORMANCE</Text>
          <Text style={styles.title}>TRAIN.</Text>
          <Text style={styles.date}>{today}</Text>
        </Reveal>

        <View style={styles.rule} />

        <Reveal delay={60} style={{ marginTop: 22 }}>
          <WorkoutBuilderCard />
        </Reveal>

        <Reveal delay={120}>
          <SavedSessionsCard />
        </Reveal>

        <Reveal delay={180}>
          <ActivityCard onLog={() => setLogOpen(true)} />
        </Reveal>

        <View style={styles.footer}>
          <Logo width={40} style={{ opacity: 0.25 }} />
          <Text style={styles.footerText}>
            General wellness guidance, not medical advice. Talk to your doctor before starting a new routine.
          </Text>
        </View>
      </ScrollView>

      <LogWorkoutSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </View>
  );
}

function CardHeader({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.cardHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardKicker}>{kicker}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/* ---------------------------------- Saved sessions ---------------------------------- */

function SavedSessionsCard() {
  const { plans } = useSavedPlans();

  useFocusEffect(
    useCallback(() => {
      savedPlans.refresh();
    }, [])
  );

  if (!plans?.length) return null;

  return (
    <View style={styles.card}>
      <CardHeader
        kicker="YOUR LIBRARY"
        title="SAVED SESSIONS"
        right={
          <PressableScale
            onPress={() => router.push('/workout-history')}
            style={styles.seeAll}
            scaleTo={0.94}
            accessibilityLabel="See all saved sessions"
          >
            <Text style={styles.seeAllText}>SEE ALL</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.yellow} />
          </PressableScale>
        }
      />
      <View style={{ gap: 8 }}>
        {plans.slice(0, 3).map((plan) => (
          <SessionRow key={plan.id} plan={plan} />
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------- Activity ------------------------------------- */

function ActivityCard({ onLog }: { onLog: () => void }) {
  const { week, weekMinutes, streak, workouts, removeWorkout } = useFitness();
  const max = Math.max(60, ...week.map((d) => d.minutes));
  const recent = [...workouts].sort((a, b) => b.at - a.at).slice(0, 3);
  const activeDays = week.filter((d) => d.minutes > 0).length;

  return (
    <View style={styles.card}>
      <CardHeader
        kicker="THIS WEEK"
        title="ACTIVITY"
        right={
          <View style={styles.headerActions}>
            {workouts.length > 0 && (
              <PressableScale
                onPress={() => router.push('/activity')}
                style={styles.seeAll}
                scaleTo={0.94}
                accessibilityLabel="See all activity"
              >
                <Text style={styles.seeAllText}>SEE ALL</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.yellow} />
              </PressableScale>
            )}
            <View style={styles.streakWrap}>
              <View style={styles.streakPill}>
                <Ionicons name="flame" size={13} color={colors.black} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
              <Text style={styles.streakCaption}>{streak === 1 ? 'DAY' : 'DAYS'}</Text>
            </View>
          </View>
        }
      />

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.bigNumber}>{weekMinutes}</Text>
          <Text style={styles.statLabel}>MINUTES</Text>
        </View>
        <View style={styles.statRule} />
        <View style={styles.stat}>
          <Text style={styles.bigNumber}>
            {activeDays}
            <Text style={styles.bigUnit}> /7</Text>
          </Text>
          <Text style={styles.statLabel}>DAYS ACTIVE</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {week.map((d, i) => {
          const isToday = i === week.length - 1;
          return (
            <View key={d.day} style={[styles.barCol, isToday && styles.barColToday]}>
              <Text style={[styles.barValue, isToday && { color: colors.yellow }]}>{d.minutes > 0 ? d.minutes : ' '}</Text>
              <View style={styles.barTrack}>
                <Bar pct={d.minutes / max} highlight={isToday} />
              </View>
              <Text style={[styles.barLabel, isToday && { color: colors.yellow }]}>
                {DAY_LETTERS[new Date(d.day).getDay()]}
              </Text>
            </View>
          );
        })}
      </View>

      {recent.length > 0 ? (
        <View style={styles.sessionBlock}>
          <Text style={styles.metaLabel}>RECENT</Text>
          <View style={{ gap: 8 }}>
            {recent.map((workout) => (
              <ActivitySession key={workout.id} workout={workout} onRemove={() => removeWorkout(workout.id)} />
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.emptyActivity}>Log a session and it will land here.</Text>
      )}

      <Button label="LOG WORKOUT" icon="add" onPress={onLog} style={{ marginTop: 18 }} />
    </View>
  );
}

function Bar({ pct, highlight }: { pct: number; highlight: boolean }) {
  const target = highlight ? Math.max(pct, 0.08) : pct;
  const h = useSharedValue(target);
  useEffect(() => {
    h.value = withTiming(target, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [target]);
  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` }));
  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: highlight ? colors.yellow : pct > 0 ? colors.white : colors.border }, style]}
    />
  );
}

/* ------------------------------------ Log sheet ------------------------------------- */

const DURATIONS = [15, 30, 45, 60];

function LogWorkoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { logWorkout } = useFitness();
  const [type, setType] = useState<WorkoutType>('strength');
  const [minutes, setMinutes] = useState(45);
  const [custom, setCustom] = useState('');

  const usingCustom = custom.trim().length > 0;
  const customMinutes = Number(custom);
  const resolved = usingCustom ? customMinutes : minutes;
  const canSave = Number.isInteger(resolved) && resolved >= 1 && resolved <= 600;

  const close = () => {
    setCustom('');
    onClose();
  };

  const save = () => {
    if (!canSave) return;
    logWorkout(type, resolved);
    haptic.success();
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grabber} />
        <Text style={styles.cardKicker}>NICE WORK</Text>
        <Text style={[styles.cardTitle, { fontSize: 34, lineHeight: 42 }]}>LOG WORKOUT</Text>

        <Text style={[styles.metaLabel, { marginTop: 18 }]}>TYPE</Text>
        <View style={styles.typeGrid}>
          {WORKOUT_TYPES.map((t) => {
            const active = t.key === type;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  haptic.select();
                  setType(t.key);
                }}
                style={[styles.typeCell, active && styles.typeCellActive]}
              >
                <Ionicons
                  name={t.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={active ? colors.black : colors.white}
                />
                <Text style={[styles.typeText, active && { color: colors.black }]}>{t.label.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.metaLabel, { marginTop: 18 }]}>DURATION</Text>
        <View style={styles.durations}>
          {DURATIONS.map((m) => {
            const active = !usingCustom && m === minutes;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  haptic.select();
                  setCustom('');
                  setMinutes(m);
                }}
                style={[styles.duration, active && styles.presetChipActive]}
              >
                <Text style={[styles.durationText, active && { color: colors.yellow }]}>{m}</Text>
                <Text style={[styles.durationUnit, active && { color: colors.yellow }]}>MIN</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.customDuration, usingCustom && styles.customDurationActive]}>
          <TextInput
            value={custom}
            onChangeText={(value) => setCustom(value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Custom minutes"
            placeholderTextColor={colors.mutedDark}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            style={styles.customInput}
            selectionColor={colors.yellow}
            cursorColor={colors.yellow}
            accessibilityLabel="Custom duration in minutes"
          />
          <Text style={[styles.durationUnit, usingCustom && { color: colors.yellow }]}>MIN</Text>
        </View>
        {usingCustom && !canSave && <Text style={styles.customHint}>Use 1 to 600 minutes.</Text>}

        <Button label="SAVE WORKOUT" icon="checkmark" onPress={save} disabled={!canSave} style={{ marginTop: 22 }} />
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------- Styles -------------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 56, lineHeight: 72, marginTop: 2 },
  date: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 2 },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginTop: 22,
  },

  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2.5 },
  cardTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 36, marginTop: 2 },
  metaLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.8 },
  bigNumber: { fontFamily: fonts.display, color: colors.white, fontSize: 40, lineHeight: 52 },
  bigUnit: { fontFamily: fonts.display, color: colors.mutedDark, fontSize: 22 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  stat: { flex: 1 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 1.8, marginTop: -2 },
  statRule: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 16 },

  presetChipActive: { backgroundColor: colors.black, borderColor: colors.black },

  seeAll: {
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
  seeAllText: { fontFamily: fonts.black, color: colors.yellow, fontSize: 10, letterSpacing: 1.5 },

  headerActions: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  streakWrap: { alignItems: 'flex-end', gap: 4 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
  },
  streakText: { fontFamily: fonts.black, color: colors.black, fontSize: 13 },
  streakCaption: { fontFamily: fonts.bold, color: colors.muted, fontSize: 8, letterSpacing: 1.4 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, height: 148, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 6, paddingTop: 6, borderRadius: 12 },
  barColToday: { backgroundColor: 'rgba(254,219,0,0.08)' },
  barValue: { fontFamily: fonts.black, color: colors.muted, fontSize: 9, letterSpacing: 0.4, height: 12 },
  barTrack: {
    flex: 1,
    width: 18,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 7,
    overflow: 'hidden',
  },
  bar: { width: '100%' },
  barLabel: { fontFamily: fonts.black, color: colors.muted, fontSize: 10, marginBottom: 6 },
  sessionBlock: { marginTop: 18, gap: 10 },
  emptyActivity: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginTop: 18 },

  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderBright,
    marginBottom: 16,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  typeCell: {
    width: '31.8%',
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeCellActive: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  typeText: { fontFamily: fonts.black, color: colors.white, fontSize: 10, letterSpacing: 1.2 },
  durations: { flexDirection: 'row', gap: 8, marginTop: 10 },
  duration: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: { fontFamily: fonts.display, color: colors.white, fontSize: 20, lineHeight: 26 },
  durationUnit: { fontFamily: fonts.black, color: colors.muted, fontSize: 8, letterSpacing: 1.2 },
  customDuration: {
    marginTop: 8,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  customDurationActive: { borderColor: colors.yellow, backgroundColor: colors.black },
  customInput: { flex: 1, fontFamily: fonts.bold, color: colors.white, fontSize: 16, paddingVertical: 0 },
  customHint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 6 },

  footer: { alignItems: 'center', gap: 10, marginTop: 26, paddingHorizontal: 40 },
  footerText: { fontFamily: fonts.medium, color: colors.mutedDark, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
