import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, PressableScale, Reveal } from '@/components/ui';
import { WorkoutBuilderCard } from '@/components/WorkoutBuilderCard';
import { TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { WORKOUT_TYPES, useFitness, type WorkoutType } from '@/context/fitness';
import { haptic } from '@/utils/haptics';

type Preset = { key: string; name: string; work: number; rest: number; rounds: number };

const PRESETS: Preset[] = [
  { key: 'tabata', name: 'TABATA', work: 20, rest: 10, rounds: 8 },
  { key: 'hiit', name: 'HIIT 40/20', work: 40, rest: 20, rounds: 10 },
  { key: 'emom', name: 'EMOM', work: 60, rest: 0, rounds: 10 },
  { key: 'custom', name: 'CUSTOM', work: 30, rest: 15, rounds: 6 },
];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function timeOfDay(t: number) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const { streak, workouts } = useFitness();
  const totalMinutes = workouts.reduce((s, w) => s + w.minutes, 0);
  const totalHours = totalMinutes >= 600 ? `${Math.round(totalMinutes / 60)}` : (totalMinutes / 60).toFixed(1);
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

        <Reveal delay={60} style={styles.stats}>
          <Stat value={`${streak}`} label="DAY STREAK" icon="flame" />
          <Stat value={`${workouts.length}`} label="WORKOUTS" icon="barbell" divider />
          <Stat value={totalHours} label="HOURS TRAINED" icon="time" divider />
        </Reveal>

        <Reveal delay={120}>
          <WorkoutBuilderCard />
        </Reveal>

        <Reveal delay={170}>
          <IntervalCard />
        </Reveal>

        <Reveal delay={220}>
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

function Stat({
  value,
  unit,
  label,
  icon,
  divider,
}: {
  value: string;
  unit?: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  divider?: boolean;
}) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Ionicons name={icon} size={14} color={colors.yellow} />
      <Text style={styles.statValue}>
        {value}
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
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

/* ---------------------------------- Interval timer ---------------------------------- */

function IntervalCard() {
  const [selected, setSelected] = useState('tabata');
  const [custom, setCustom] = useState({ work: 30, rest: 15, rounds: 6 });
  const preset = PRESETS.find((p) => p.key === selected)!;
  const cfg = selected === 'custom' ? { ...preset, ...custom } : preset;
  const total = cfg.rounds * cfg.work + (cfg.rounds - 1) * cfg.rest;

  const start = () => {
    haptic.medium();
    router.push({
      pathname: '/timer',
      params: { work: cfg.work, rest: cfg.rest, rounds: cfg.rounds, name: cfg.name },
    });
  };

  return (
    <View style={[styles.card, styles.timerCard]}>
      <LinearGradient
        colors={[colors.yellow, colors.yellowDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Logo
        width={260}
        color="black"
        style={{ position: 'absolute', right: -60, top: -20, opacity: 0.07, transform: [{ rotate: '-10deg' }] }}
      />
      <Text style={[styles.cardKicker, { color: 'rgba(0,0,0,0.55)' }]}>WORKOUT TOOL</Text>
      <Text style={[styles.cardTitle, { color: colors.black, fontSize: 38, lineHeight: 46 }]}>INTERVAL{'\n'}TIMER</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20, marginTop: 16 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {PRESETS.map((p) => {
          const active = p.key === selected;
          return (
            <Pressable
              key={p.key}
              onPress={() => {
                haptic.select();
                setSelected(p.key);
              }}
              style={[styles.presetChip, active && styles.presetChipActive]}
            >
              <Text style={[styles.presetText, active && { color: colors.yellow }]}>{p.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected === 'custom' ? (
        <View style={styles.customRow}>
          <MiniStepper
            label="WORK"
            value={custom.work}
            suffix="s"
            onChange={(work) => setCustom((c) => ({ ...c, work }))}
            step={5}
            min={5}
            max={300}
          />
          <MiniStepper
            label="REST"
            value={custom.rest}
            suffix="s"
            onChange={(rest) => setCustom((c) => ({ ...c, rest }))}
            step={5}
            min={0}
            max={300}
          />
          <MiniStepper
            label="ROUNDS"
            value={custom.rounds}
            onChange={(rounds) => setCustom((c) => ({ ...c, rounds }))}
            step={1}
            min={1}
            max={50}
          />
        </View>
      ) : (
        <View style={styles.timerSpecs}>
          <Spec value={`${cfg.work}s`} label="WORK" />
          <Spec value={cfg.rest ? `${cfg.rest}s` : '\u2014'} label="REST" />
          <Spec value={`${cfg.rounds}`} label="ROUNDS" />
        </View>
      )}

      <PressableScale onPress={start} style={styles.startBtn} scaleTo={0.97}>
        <Ionicons name="play" size={18} color={colors.yellow} />
        <Text style={styles.startText}>START {'\u00B7'} {clock(total)}</Text>
      </PressableScale>
    </View>
  );
}

function Spec({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function MiniStepper({
  label,
  value,
  suffix = '',
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  const change = (d: number) => {
    const v = Math.min(max, Math.max(min, value + d));
    if (v !== value) {
      haptic.select();
      onChange(v);
    }
  };
  return (
    <View style={styles.mini}>
      <Text style={styles.specLabel}>{label}</Text>
      <View style={styles.miniRow}>
        <Pressable onPress={() => change(-step)} hitSlop={8} style={styles.miniBtn}>
          <Ionicons name="remove" size={14} color={colors.yellow} />
        </Pressable>
        <Text style={styles.miniValue}>
          {value}
          {suffix}
        </Text>
        <Pressable onPress={() => change(step)} hitSlop={8} style={styles.miniBtn}>
          <Ionicons name="add" size={14} color={colors.yellow} />
        </Pressable>
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
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={13} color={colors.black} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        }
      />

      <View style={{ flexDirection: 'row', gap: 24, marginTop: 4 }}>
        <View>
          <Text style={styles.bigNumber}>
            {weekMinutes}
            <Text style={styles.bigUnit}> MIN</Text>
          </Text>
        </View>
        <View>
          <Text style={styles.bigNumber}>
            {activeDays}
            <Text style={styles.bigUnit}>/7 DAYS</Text>
          </Text>
        </View>
      </View>

      <View style={styles.chart}>
        {week.map((d, i) => {
          const isToday = i === week.length - 1;
          return (
            <View key={d.day} style={styles.barCol}>
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

      {recent.length > 0 && (
        <View style={{ marginTop: 18, gap: 8 }}>
          {recent.map((w) => {
            const t = WORKOUT_TYPES.find((x) => x.key === w.type)!;
            return (
              <View key={w.id} style={styles.recent}>
                <View style={styles.recentIcon}>
                  <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.yellow} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{t.label}</Text>
                  <Text style={styles.recentMeta}>
                    {new Date(w.at).toLocaleDateString('en-US', { weekday: 'short' })} {'\u00B7'} {timeOfDay(w.at)}
                  </Text>
                </View>
                <Text style={styles.recentMin}>{w.minutes} MIN</Text>
                <Pressable
                  onPress={() => { haptic.select(); removeWorkout(w.id); }}
                  hitSlop={10}
                  accessibilityLabel="Delete workout"
                >
                  <Ionicons name="close" size={16} color={colors.mutedDark} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Button label="LOG WORKOUT" icon="add" onPress={onLog} style={{ marginTop: 18 }} />
    </View>
  );
}

function Bar({ pct, highlight }: { pct: number; highlight: boolean }) {
  const h = useSharedValue(pct);
  useEffect(() => {
    h.value = withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [pct]);
  const style = useAnimatedStyle(() => ({ height: `${Math.max(h.value, 0.03) * 100}%` }));
  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: highlight ? colors.yellow : pct > 0 ? colors.white : colors.border }, style]}
    />
  );
}

/* ------------------------------------ Log sheet ------------------------------------- */

const DURATIONS = [15, 30, 45, 60, 90];

function LogWorkoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { logWorkout } = useFitness();
  const [type, setType] = useState<WorkoutType>('strength');
  const [minutes, setMinutes] = useState(45);

  const save = () => {
    logWorkout(type, minutes);
    haptic.success();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
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
            const active = m === minutes;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  haptic.select();
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

        <Button label="SAVE WORKOUT" icon="checkmark" onPress={save} style={{ marginTop: 22 }} />
      </View>
    </Modal>
  );
}

/* -------------------------------------- Styles -------------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 56, lineHeight: 72, marginTop: 2 },
  date: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 2 },

  stats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 36 },
  statUnit: { fontFamily: fonts.display, color: colors.mutedDark, fontSize: 16 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.5 },

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
  bigNumber: { fontFamily: fonts.display, color: colors.white, fontSize: 40, lineHeight: 50 },
  bigUnit: { fontFamily: fonts.display, color: colors.mutedDark, fontSize: 18 },

  timerCard: { borderWidth: 0, backgroundColor: colors.yellow },
  presetChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
  },
  presetChipActive: { backgroundColor: colors.black, borderColor: colors.black },
  presetText: { fontFamily: fonts.black, color: colors.black, fontSize: 11, letterSpacing: 1.2 },
  timerSpecs: { flexDirection: 'row', marginTop: 18 },
  specValue: { fontFamily: fonts.display, color: colors.black, fontSize: 30, lineHeight: 38 },
  specLabel: { fontFamily: fonts.black, color: 'rgba(0,0,0,0.5)', fontSize: 9, letterSpacing: 1.8 },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  mini: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.08)',
    gap: 6,
  },
  miniRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniValue: { fontFamily: fonts.display, color: colors.black, fontSize: 20, lineHeight: 26 },
  startBtn: {
    marginTop: 18,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startText: { fontFamily: fonts.black, color: colors.yellow, fontSize: 14, letterSpacing: 1.5 },

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
  chart: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, height: 120 },
  barCol: { flex: 1, alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, width: 22, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontFamily: fonts.black, color: colors.mutedDark, fontSize: 10 },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(254,219,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  recentMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 1 },
  recentMin: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1 },

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

  footer: { alignItems: 'center', gap: 10, marginTop: 26, paddingHorizontal: 40 },
  footerText: { fontFamily: fonts.medium, color: colors.mutedDark, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
