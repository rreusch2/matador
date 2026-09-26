import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useFitness } from '@/context/fitness';
import {
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  WorkoutError,
  generateWorkout,
  markPlanCompleted,
  planStore,
  type Intensity,
  type Move,
  type WorkoutPlan,
} from '@/services/workouts';
import { haptic } from '@/utils/haptics';

type IconName = keyof typeof Ionicons.glyphMap;

const enter = (i: number) => FadeInDown.delay(80 + i * 45).duration(420).easing(Easing.out(Easing.cubic));

const INTENSITY_BARS: Record<Intensity, number> = { low: 1, moderate: 2, high: 3 };

export default function WorkoutPlanScreen() {
  const insets = useSafeAreaInsets();
  const { logWorkout } = useFitness();
  const [plan, setPlan] = useState<WorkoutPlan | null>(planStore.get());
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  if (!plan) {
    return (
      <View style={[styles.screen, styles.empty, { paddingTop: insets.top }]}>
        <Ionicons name="barbell-outline" size={40} color={colors.mutedDark} />
        <Text style={styles.emptyText}>No session yet. Build one from the Train tab.</Text>
        <Button label="GO TO TRAIN" onPress={() => router.replace('/train')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const goal = GOAL_OPTIONS.find((g) => g.key === plan.prefs.goal);
  const equipment = EQUIPMENT_OPTIONS.find((e) => e.key === plan.prefs.equipment);
  const level = LEVEL_OPTIONS.find((l) => l.key === plan.prefs.level);
  const totalSets = plan.main.reduce((sum, m) => sum + (m.sets ?? 0), 0);

  const regenerate = async () => {
    if (regenerating) return;
    haptic.medium();
    setError(null);
    setRegenerating(true);
    try {
      const next = await generateWorkout(plan.prefs, {
        notes: plan.notes ?? undefined,
        avoid: plan.main.map((m) => m.name),
      });
      planStore.set(next);
      setPlan(next);
      setLogged(false);
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(e instanceof WorkoutError ? e.message : 'Could not build a new version. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const log = () => {
    logWorkout(plan.logAs, plan.minutes);
    markPlanCompleted(plan.id);
    setLogged(true);
    haptic.success();
  };

  let row = 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        key={plan.id}
        showsVerticalScrollIndicator={false}
        style={regenerating && { opacity: 0.35 }}
        scrollEnabled={!regenerating}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 140 }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.kicker}>BUILT FOR YOU</Text>
          <Text style={styles.title}>{plan.title}</Text>
          {!!plan.summary && <Text style={styles.summary}>{plan.summary}</Text>}
          <View style={styles.chips}>
            <Chip icon="time-outline" text={`${plan.minutes} MIN`} />
            {goal && <Chip icon={goal.icon as IconName} text={goal.label.toUpperCase()} />}
            {equipment && <Chip icon={equipment.icon as IconName} text={equipment.label.toUpperCase()} />}
            {level && <Chip icon="speedometer-outline" text={level.label.toUpperCase()} />}
            <IntensityChip intensity={plan.intensity} />
          </View>
          {!!plan.notes && (
            <View style={styles.adjusted}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.muted} />
              <Text style={styles.adjustedText} numberOfLines={2}>
                Adjusted for: {plan.notes}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={enter(0)} style={styles.stats}>
          <Stat value={`${plan.main.length}`} label="EXERCISES" />
          <Stat value={`${totalSets}`} label="WORKING SETS" divider />
          <Stat value={`${plan.minutes}`} label="MINUTES" divider />
        </Animated.View>

        {!!plan.coachNote && (
          <Animated.View entering={enter(1)} style={styles.note}>
            <Logo width={30} color="yellow" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteLabel}>COACH NOTE</Text>
              <Text style={styles.noteText}>{plan.coachNote}</Text>
            </View>
          </Animated.View>
        )}

        <Section title="WARM-UP" icon="sunny-outline" index={2}>
          {plan.warmup.map((m, i) => (
            <MoveRow key={`w${i}`} move={m} delay={row++} />
          ))}
        </Section>

        <Section title="MAIN WORK" icon="barbell-outline" index={3} highlight>
          {plan.main.map((m, i) => (
            <MoveRow key={`m${i}`} move={m} delay={row++} number={i + 1} />
          ))}
        </Section>

        {plan.finisher.length > 0 && (
          <Section title="FINISHER" icon="flame-outline" index={4}>
            {plan.finisher.map((m, i) => (
              <MoveRow key={`f${i}`} move={m} delay={row++} accent />
            ))}
          </Section>
        )}

        <Section title="COOL-DOWN" icon="leaf-outline" index={5}>
          {plan.cooldown.map((m, i) => (
            <MoveRow key={`c${i}`} move={m} delay={row++} />
          ))}
        </Section>

        <Text style={styles.disclaimer}>
          Listen to your body. Stop any exercise that causes pain and check with a professional if you have an injury.
        </Text>
      </ScrollView>

      {regenerating && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.yellow} size="large" />
          <Text style={styles.overlayText}>BUILDING A NEW VERSION</Text>
        </Animated.View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Close">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle}>YOUR SESSION</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 14 }]}>
        {error && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
            <Ionicons name="alert-circle" size={16} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
        <View style={styles.actionRow}>
          <PressableScale
            onPress={regenerate}
            containerStyle={{ flex: 1 }}
            style={styles.secondary}
            scaleTo={0.96}
            hapticFeedback={false}
            disabled={regenerating}
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.secondaryText}>{regenerating ? 'BUILDING\u2026' : 'NEW VERSION'}</Text>
          </PressableScale>
          <PressableScale
            onPress={logged || regenerating ? undefined : log}
            containerStyle={{ flex: 1.3 }}
            style={[styles.primary, logged && { backgroundColor: colors.white }]}
            scaleTo={0.96}
            hapticFeedback={false}
          >
            <Ionicons name={logged ? 'checkmark-circle' : 'checkmark'} size={18} color={colors.black} />
            <Text style={styles.primaryText}>{logged ? 'LOGGED' : 'LOG WORKOUT'}</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function Chip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color={colors.yellow} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function IntensityChip({ intensity }: { intensity: Intensity }) {
  const bars = INTENSITY_BARS[intensity];
  return (
    <View style={styles.chip}>
      <View style={styles.bars}>
        {[1, 2, 3].map((b) => (
          <View
            key={b}
            style={[styles.bar, { height: 4 + b * 3 }, b <= bars && { backgroundColor: colors.yellow }]}
          />
        ))}
      </View>
      <Text style={styles.chipText}>{intensity.toUpperCase()}</Text>
    </View>
  );
}

function Stat({ value, label, divider }: { value: string; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  icon,
  index,
  highlight,
  children,
}: {
  title: string;
  icon: IconName;
  index: number;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={enter(index)} style={[styles.section, highlight && styles.sectionHighlight]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={15} color={colors.yellow} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </Animated.View>
  );
}

function MoveRow({ move, number, accent, delay }: { move: Move; number?: number; accent?: boolean; delay: number }) {
  const prescription = move.sets ? `${move.sets} \u00D7 ${move.reps}` : move.reps;
  return (
    <Animated.View entering={enter(delay + 3)} style={styles.row}>
      {number ? (
        <View style={styles.num}>
          <Text style={styles.numText}>{number}</Text>
        </View>
      ) : (
        <View style={[styles.dot, accent && { backgroundColor: colors.red }]} />
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName}>{move.name}</Text>
          <Text style={[styles.dose, number ? styles.doseMain : null]}>{prescription}</Text>
        </View>
        {(!!move.cue || !!move.rest) && (
          <View style={styles.rowBottom}>
            {!!move.cue && <Text style={styles.cue}>{move.cue}</Text>}
            {!!move.rest && (
              <View style={styles.rest}>
                <Ionicons name="pause" size={9} color={colors.muted} />
                <Text style={styles.restText}>{move.rest}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 30 },
  emptyText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 14, textAlign: 'center' },

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
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 48, lineHeight: 56, marginTop: 2 },
  summary: { fontFamily: fonts.medium, color: colors.offWhite, fontSize: 15, lineHeight: 22, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.black, color: colors.white, fontSize: 9, letterSpacing: 1.2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 3, borderRadius: 1.5, backgroundColor: colors.borderBright },
  adjusted: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  adjustedText: { flex: 1, fontFamily: fonts.medium, color: colors.muted, fontSize: 12, fontStyle: 'italic' },

  stats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 30, lineHeight: 38 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.5 },

  note: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    margin: 20,
    marginBottom: 6,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: 'rgba(254,219,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(254,219,0,0.2)',
  },
  noteLabel: { fontFamily: fonts.black, color: colors.yellow, fontSize: 9, letterSpacing: 2 },
  noteText: { fontFamily: fonts.medium, color: colors.offWhite, fontSize: 13, lineHeight: 19, marginTop: 4 },

  section: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHighlight: { borderColor: 'rgba(254,219,0,0.35)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 2 },
  sectionTitle: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 2.5 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.display, color: colors.black, fontSize: 14, lineHeight: 19 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.yellow, marginHorizontal: 10, marginTop: 7 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowName: { flex: 1, fontFamily: fonts.bold, color: colors.white, fontSize: 15, lineHeight: 21 },
  dose: { fontFamily: fonts.display, color: colors.offWhite, fontSize: 15, lineHeight: 21 },
  doseMain: { color: colors.yellow, fontSize: 17 },
  rowBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 },
  cue: { flex: 1, fontFamily: fonts.medium, color: colors.muted, fontSize: 12.5, lineHeight: 17 },
  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
  },
  restText: { fontFamily: fonts.black, color: colors.muted, fontSize: 9.5, letterSpacing: 0.8 },

  disclaimer: {
    fontFamily: fonts.regular,
    color: colors.mutedDark,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 22,
    paddingHorizontal: 36,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  overlayText: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 2 },

  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 51, 64, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 51, 64, 0.35)',
  },
  errorText: { flex: 1, fontFamily: fonts.semibold, color: colors.white, fontSize: 12.5, lineHeight: 17 },
  secondary: {
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderBright,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1.2 },
  primary: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontFamily: fonts.black, color: colors.black, fontSize: 13, letterSpacing: 1.2 },
});
