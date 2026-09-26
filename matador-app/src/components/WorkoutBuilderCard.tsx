import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import {
  EQUIPMENT_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  NOTES_MAX,
  TIME_OPTIONS,
  WorkoutError,
  generateWorkout,
  planStore,
  savedPlans,
  type WorkoutPrefs,
} from '@/services/workouts';
import { haptic } from '@/utils/haptics';

type IconName = keyof typeof Ionicons.glyphMap;
type Setting = 'minutes' | 'equipment' | 'level';

const STEPS = [
  'READING YOUR GOAL',
  'CHECKING YOUR EQUIPMENT',
  'PICKING EXERCISES',
  'BALANCING SETS & REST',
  'WRITING COACHING CUES',
  'FINALIZING YOUR SESSION',
];
const STEP_MS = 1100;
/** Typical build time. The bar eases toward 90% over this, then completes when the plan arrives. */
const EXPECTED_MS = 7000;
const BUTTON_H = 56;
const layout = LinearTransition.duration(260).easing(Easing.out(Easing.cubic));

export function WorkoutBuilderCard() {
  const [prefs, setPrefs] = useState<WorkoutPrefs>({
    goal: 'muscle',
    focus: 'full',
    minutes: 45,
    equipment: 'gym',
    level: 'intermediate',
  });
  const [open, setOpen] = useState<Setting | null>(null);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [btnW, setBtnW] = useState(0);
  const progress = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      if (stepTimer.current) clearInterval(stepTimer.current);
    },
    []
  );

  const set = <K extends keyof WorkoutPrefs>(key: K, value: WorkoutPrefs[K]) => {
    if (building) return;
    if (key === open) setOpen(null);
    if (prefs[key] === value) return;
    haptic.select();
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const toggle = (s: Setting) => {
    if (building) return;
    haptic.select();
    setOpen((o) => (o === s ? null : s));
  };

  const stopSteps = () => {
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = null;
  };

  const generate = async () => {
    if (building) return;
    haptic.medium();
    setOpen(null);
    setNotesOpen(false);
    setError(null);
    setBuilding(true);
    setStep(0);
    progress.value = 0;
    progress.value = withTiming(0.9, { duration: EXPECTED_MS, easing: Easing.out(Easing.cubic) });
    stepTimer.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_MS);

    try {
      const plan = await generateWorkout(prefs, { notes });
      stopSteps();
      if (!mounted.current) return;
      setStep(STEPS.length - 1);
      progress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
      planStore.set(plan);
      savedPlans.add(plan);
      timers.current.push(
        setTimeout(() => {
          haptic.success();
          router.push('/workout-plan');
        }, 320),
        setTimeout(() => {
          cancelAnimation(progress);
          progress.value = 0;
          setBuilding(false);
        }, 900)
      );
    } catch (e) {
      stopSteps();
      if (!mounted.current) return;
      haptic.error();
      cancelAnimation(progress);
      progress.value = 0;
      setBuilding(false);
      setError(e instanceof WorkoutError ? e.message : 'Could not build your workout. Please try again.');
    }
  };

  const innerW = Math.max(0, btnW - 2);
  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * innerW }));

  const equipLabel = EQUIPMENT_OPTIONS.find((e) => e.key === prefs.equipment)!.label;
  const levelLabel = LEVEL_OPTIONS.find((l) => l.key === prefs.level)!.label;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(254,219,0,0.10)', 'rgba(254,219,0,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>PERSONALIZED</Text>
          <Text style={styles.title}>WORKOUT BUILDER</Text>
        </View>
        <View style={styles.badge}>
          <Logo width={28} color="yellow" />
        </View>
      </View>

      <Text style={styles.label}>GOAL</Text>
      <View style={styles.grid}>
        {GOAL_OPTIONS.map((g) => {
          const active = g.key === prefs.goal;
          return (
            <Pressable
              key={g.key}
              onPress={() => set('goal', g.key)}
              style={[styles.cell, styles.goal, active && styles.chipActive]}
            >
              <Ionicons name={g.icon as IconName} size={17} color={active ? colors.black : colors.yellow} />
              <Text style={[styles.chipText, styles.goalText, active && styles.chipTextActive]} numberOfLines={1}>
                {g.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>FOCUS</Text>
      <View style={styles.grid}>
        {FOCUS_OPTIONS.map((f) => {
          const active = f.key === prefs.focus;
          return (
            <Pressable
              key={f.key}
              onPress={() => set('focus', f.key)}
              style={[styles.cell, styles.focus, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tiles}>
        <Tile label="TIME" value={`${prefs.minutes} MIN`} flex={0.8} open={open === 'minutes'} onPress={() => toggle('minutes')} />
        <Tile label="EQUIPMENT" value={equipLabel} flex={1.05} open={open === 'equipment'} onPress={() => toggle('equipment')} />
        <Tile label="LEVEL" value={levelLabel} flex={1.15} open={open === 'level'} onPress={() => toggle('level')} />
      </View>

      {open && (
        <Animated.View
          key={open}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          layout={layout}
          style={styles.segment}
        >
          {open === 'minutes' &&
            TIME_OPTIONS.map((m) => (
              <Option key={m} active={m === prefs.minutes} onPress={() => set('minutes', m)}>
                <Text style={[styles.segValue, m === prefs.minutes && styles.chipTextActive]}>{m}</Text>
                <Text style={[styles.segUnit, m === prefs.minutes && styles.chipTextActive]}>MIN</Text>
              </Option>
            ))}
          {open === 'equipment' &&
            EQUIPMENT_OPTIONS.map((e) => {
              const active = e.key === prefs.equipment;
              return (
                <Option key={e.key} active={active} onPress={() => set('equipment', e.key)}>
                  <Ionicons name={e.icon as IconName} size={16} color={active ? colors.black : colors.yellow} />
                  <Text style={[styles.segSmall, active && styles.chipTextActive]} numberOfLines={1}>
                    {e.label.toUpperCase()}
                  </Text>
                </Option>
              );
            })}
          {open === 'level' &&
            LEVEL_OPTIONS.map((l) => {
              const active = l.key === prefs.level;
              return (
                <Option key={l.key} active={active} onPress={() => set('level', l.key)}>
                  <Text style={[styles.segSmall, active && styles.chipTextActive]}>{l.label.toUpperCase()}</Text>
                </Option>
              );
            })}
        </Animated.View>
      )}

      <Animated.View layout={layout} style={{ marginTop: 8 }}>
        {notesOpen ? (
          <Animated.View entering={FadeIn.duration(220)} style={[styles.notes, styles.notesOpen]}>
            <View style={styles.notesHeader}>
              <Text style={styles.tileLabel}>NOTES FOR YOUR COACH</Text>
              <Text style={styles.notesCount}>
                {notes.length}/{NOTES_MAX}
              </Text>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. sore lower back, no jumping, want more arms"
              placeholderTextColor={colors.mutedDark}
              style={styles.notesInput}
              maxLength={NOTES_MAX}
              multiline
              autoFocus
              selectionColor={colors.yellow}
              cursorColor={colors.yellow}
              onBlur={() => setNotesOpen(false)}
              editable={!building}
            />
          </Animated.View>
        ) : (
          <Pressable
            onPress={() => {
              if (building) return;
              haptic.select();
              setNotesOpen(true);
            }}
            style={styles.notes}
            accessibilityRole="button"
            accessibilityLabel="Add notes for your coach"
          >
            <Ionicons
              name={notes ? 'chatbubble-ellipses' : 'add-circle-outline'}
              size={17}
              color={notes ? colors.yellow : colors.muted}
            />
            <Text style={[styles.notesPreview, !!notes && { color: colors.white }]} numberOfLines={1}>
              {notes || 'Add notes: injuries, limits, preferences'}
            </Text>
            <Text style={styles.optional}>{notes ? 'EDIT' : 'OPTIONAL'}</Text>
          </Pressable>
        )}
      </Animated.View>

      {error && !building && (
        <Animated.View entering={FadeIn.duration(200)} layout={layout} style={styles.error}>
          <Ionicons name="alert-circle" size={17} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      <Animated.View layout={layout} style={{ marginTop: 16 }}>
        {building ? (
          <View style={styles.progress} onLayout={(e) => setBtnW(e.nativeEvent.layout.width)}>
            <Text style={styles.progressText}>{STEPS[step]}</Text>
            <Animated.View style={[styles.progressFill, fillStyle]}>
              <View style={[styles.progressInner, { width: innerW }]}>
                <Text style={[styles.progressText, { color: colors.black }]}>{STEPS[step]}</Text>
              </View>
            </Animated.View>
          </View>
        ) : (
          <PressableScale onPress={generate} style={styles.generate} scaleTo={0.97} hapticFeedback={false}>
            <Text style={styles.generateText}>{error ? 'TRY AGAIN' : 'GENERATE WORKOUT'}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.black} />
          </PressableScale>
        )}
      </Animated.View>
    </View>
  );
}

function Tile({
  label,
  value,
  flex,
  open,
  onPress,
}: {
  label: string;
  value: string;
  flex: number;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, { flex }, open && styles.tileOpen]} accessibilityRole="button">
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={open ? colors.yellow : colors.mutedDark} />
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function Option({ active, onPress, children }: { active: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={[styles.segCell, active && styles.segActive]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2.5 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 34, marginTop: 2 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(254,219,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: { fontFamily: fonts.black, color: colors.muted, fontSize: 10, letterSpacing: 2, marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goal: { flexBasis: '45%', height: 56, flexDirection: 'row', gap: 7, paddingHorizontal: 8 },
  goalText: { letterSpacing: 0.5 },
  focus: { height: 44, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  chipText: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 1 },
  chipTextActive: { color: colors.black },

  tiles: { flexDirection: 'row', gap: 8, marginTop: 20 },
  tile: {
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileOpen: { borderColor: colors.yellow },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.5 },
  tileValue: { fontFamily: fonts.display, color: colors.white, fontSize: 15, lineHeight: 20, marginTop: 4 },

  notes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  notesOpen: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
    paddingVertical: 11,
    borderStyle: 'solid',
    borderColor: colors.yellow,
  },
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notesCount: { fontFamily: fonts.bold, color: colors.mutedDark, fontSize: 9, letterSpacing: 1 },
  notesInput: {
    minHeight: 44,
    maxHeight: 96,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  notesPreview: { flex: 1, fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  optional: { fontFamily: fonts.black, color: colors.mutedDark, fontSize: 9, letterSpacing: 1.2 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 51, 64, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 51, 64, 0.35)',
  },
  errorText: { flex: 1, fontFamily: fonts.semibold, color: colors.white, fontSize: 13, lineHeight: 18 },
  segment: {
    flexDirection: 'row',
    marginTop: 8,
    padding: 4,
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segCell: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  segActive: { backgroundColor: colors.yellow },
  segValue: { fontFamily: fonts.display, color: colors.white, fontSize: 18, lineHeight: 22 },
  segUnit: { fontFamily: fonts.black, color: colors.muted, fontSize: 8, letterSpacing: 1.2 },
  segSmall: { fontFamily: fonts.black, color: colors.white, fontSize: 9, letterSpacing: 0.8 },

  generate: {
    height: BUTTON_H,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  generateText: { fontFamily: fonts.black, color: colors.black, fontSize: 14, letterSpacing: 1.5 },
  progress: {
    height: BUTTON_H,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.borderBright,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.yellow, overflow: 'hidden' },
  progressInner: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  progressText: {
    fontFamily: fonts.black,
    color: colors.white,
    fontSize: 12,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
