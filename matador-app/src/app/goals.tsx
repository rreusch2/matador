import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useFitness } from '@/context/fitness';
import {
  addDays,
  archiveGoal,
  createGoal,
  daysUntil,
  faceGoal,
  formatDay,
  goalStore,
  logWeighIn,
  updateLiftProgress,
  useGoals,
  type Goal,
  type GoalKind,
  type WeightUnit,
} from '@/services/goals';
import { haptic } from '@/utils/haptics';

const KINDS: { kind: GoalKind; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }[] = [
  { kind: 'sessions', icon: 'calendar-outline', label: 'DAYS A WEEK', sub: 'Fills from your log' },
  { kind: 'weight', icon: 'body-outline', label: 'WEIGHT', sub: 'Private to you' },
  { kind: 'lift', icon: 'barbell-outline', label: 'A LIFT', sub: 'A number on a move' },
  { kind: 'event', icon: 'flag-outline', label: 'A DATE', sub: 'A day to be ready' },
];

function isKind(value: string | undefined): value is GoalKind {
  return value === 'sessions' || value === 'weight' || value === 'lift' || value === 'event';
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { goals, weighIns, loading, error } = useGoals();
  const { week } = useFitness();
  const activeDays = week.filter((day) => day.minutes > 0).length;
  const [draft, setDraft] = useState<GoalKind | null>(isKind(add) ? add : null);

  useFocusEffect(
    useCallback(() => {
      goalStore.refresh({ force: true });
    }, [])
  );

  useEffect(() => {
    if (isKind(add)) setDraft(add);
  }, [add]);

  const list = goals ?? [];
  const hasSessions = list.some((goal) => goal.kind === 'sessions');

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 48 }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.kicker}>YOUR AIM</Text>
          <Text style={styles.title}>GOALS.</Text>
          <Text style={styles.lead}>Sessions count themselves from the workouts you log.</Text>
        </Animated.View>

        {goals === null && loading ? (
          <ActivityIndicator color={colors.yellow} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 12, paddingHorizontal: 20 }}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {list.map((goal, index) => (
              <Animated.View key={goal.id} entering={FadeInDown.delay(index * 40).duration(320).easing(Easing.out(Easing.cubic))}>
                <GoalPanel goal={goal} activeDays={activeDays} />
              </Animated.View>
            ))}

            {draft ? (
              <GoalForm
                kind={draft}
                blocked={draft === 'sessions' && hasSessions}
                onCancel={() => setDraft(null)}
                onDone={() => setDraft(null)}
              />
            ) : (
              <View style={{ gap: 8 }}>
                {list.length === 0 ? null : <Text style={styles.note}>Add another aim.</Text>}
                {KINDS.filter((item) => item.kind !== 'sessions' || !hasSessions).map((item) => (
                  <PressableScale
                    key={item.kind}
                    onPress={() => setDraft(item.kind)}
                    style={styles.kind}
                    scaleTo={0.98}
                    accessibilityLabel={item.label}
                  >
                    <View style={styles.kindIcon}>
                      <Ionicons name={item.icon} size={18} color={colors.black} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kindLabel}>{item.label}</Text>
                      <Text style={styles.kindSub}>{item.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.yellow} />
                  </PressableScale>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Back">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle}>GOALS</Text>
        <View style={{ width: 42 }} />
      </View>
    </View>
  );
}

function GoalPanel({ goal, activeDays }: { goal: Goal; activeDays: number }) {
  const { weighIns } = useGoals();
  const face = faceGoal(goal, weighIns, activeDays);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unit = goal.weightUnit ?? goal.loadUnit ?? 'lb';

  const saveMark = async () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (goal.kind === 'weight' && goal.weightUnit) await logWeighIn(goal.id, parsed, goal.weightUnit);
      else if (goal.kind === 'lift') {
        const hasLoad = goal.targetLoad != null && goal.targetLoad > 0;
        await updateLiftProgress(goal.id, hasLoad ? goal.currentReps : Math.round(parsed), hasLoad ? parsed : goal.currentLoad);
      }
      setValue('');
      haptic.success();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.');
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    setBusy(true);
    try {
      await archiveGoal(goal.id);
      haptic.tap();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end that goal.');
      setBusy(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelKicker}>{face.kicker}</Text>
      <View style={styles.goalTop}>
        <Text style={[styles.panelTitle, { flex: 1 }]} numberOfLines={2}>
          {face.title}
        </Text>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{face.stat}</Text>
          {face.statUnit ? <Text style={styles.statUnit}>{face.statUnit}</Text> : null}
        </View>
      </View>
      {face.pct != null ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, face.pct)) * 100)}%` }]} />
        </View>
      ) : null}
      <Text style={styles.hint}>{face.hint}</Text>
      {goal.kind === 'weight' || goal.kind === 'lift' ? (
        <View style={styles.markRow}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={goal.kind === 'weight' ? `Weigh-in (${unit})` : goal.targetLoad ? `Load (${unit})` : 'Reps now'}
            placeholderTextColor={colors.mutedDark}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <PressableScale onPress={saveMark} disabled={busy} style={styles.saveMark} scaleTo={0.97} accessibilityLabel="Save">
            <Text style={styles.saveMarkText}>SAVE</Text>
          </PressableScale>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PressableScale onPress={end} disabled={busy} style={styles.end} scaleTo={0.98} accessibilityLabel="End goal">
        <Text style={styles.endText}>END GOAL</Text>
      </PressableScale>
    </View>
  );
}

function GoalForm({
  kind,
  blocked,
  onCancel,
  onDone,
}: {
  kind: GoalKind;
  blocked: boolean;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [current, setCurrent] = useState('');
  const [target, setTarget] = useState('');
  const [reps, setReps] = useState('5');
  const [name, setName] = useState('');
  const [horizon, setHorizon] = useState(56);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      setBusy(true);
      if (kind === 'sessions') {
        await createGoal({
          kind,
          sessionsPerWeek: daysPerWeek,
          title: `Train ${daysPerWeek} ${daysPerWeek === 1 ? 'day' : 'days'} a week`,
        });
      } else if (kind === 'weight') {
        const start = Number(current);
        const aim = Number(target);
        if (!Number.isFinite(start) || !Number.isFinite(aim) || start < 20 || aim < 20 || start > 800 || aim > 800) {
          throw new Error('Enter a current weight and a target between 20 and 800.');
        }
        await createGoal({
          kind,
          title: `${aim} ${unit} by ${formatDay(addDays(horizon)).toLowerCase()}`,
          startWeight: start,
          targetWeight: aim,
          weightUnit: unit,
          targetDate: addDays(horizon),
        });
      } else if (kind === 'lift') {
        const move = name.trim();
        const repCount = Math.round(Number(reps));
        const load = target.trim() === '' ? null : Number(target);
        if (move.length < 2) throw new Error('Name the move.');
        if (!Number.isFinite(repCount) || repCount < 1 || repCount > 200) throw new Error('Enter the reps you want.');
        if (load != null && (!Number.isFinite(load) || load < 0)) throw new Error('Enter a load, or leave it blank.');
        await createGoal({
          kind,
          title: move,
          liftName: move,
          targetReps: repCount,
          targetLoad: load,
          loadUnit: unit,
          targetDate: addDays(horizon),
        });
      } else {
        const title = name.trim();
        if (title.length < 2) throw new Error('Name the date.');
        await createGoal({ kind, title, targetDate: addDays(horizon) });
      }
      haptic.success();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That goal did not save.');
      setBusy(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelKicker}>NEW GOAL</Text>
      <Text style={styles.panelTitle}>
        {kind === 'sessions' ? 'DAYS A WEEK' : kind === 'weight' ? 'WEIGHT' : kind === 'lift' ? 'A LIFT' : 'A DATE'}
      </Text>

      {blocked ? (
        <Text style={styles.hint}>You already have a days-a-week goal. End it to change the number.</Text>
      ) : kind === 'sessions' ? (
        <View style={styles.stepper}>
          <PressableScale
            onPress={() => setDaysPerWeek((n) => Math.max(1, n - 1))}
            style={styles.step}
            scaleTo={0.94}
            accessibilityLabel="Fewer days"
          >
            <Ionicons name="remove" size={18} color={colors.white} />
          </PressableScale>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.stepValue}>{daysPerWeek}</Text>
            <Text style={styles.statUnit}>{daysPerWeek === 1 ? 'DAY' : 'DAYS'}</Text>
          </View>
          <PressableScale
            onPress={() => setDaysPerWeek((n) => Math.min(7, n + 1))}
            style={styles.step}
            scaleTo={0.94}
            accessibilityLabel="More days"
          >
            <Ionicons name="add" size={18} color={colors.white} />
          </PressableScale>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {kind !== 'weight' ? (
            <Field label={kind === 'lift' ? 'MOVE' : 'NAME'} value={name} onChange={setName} placeholder={kind === 'lift' ? 'Bench press' : '5K'} />
          ) : null}
          {kind === 'weight' ? (
            <View style={styles.pair}>
              <Field label="NOW" value={current} onChange={setCurrent} placeholder="182" numeric />
              <Field label="TARGET" value={target} onChange={setTarget} placeholder="170" numeric />
            </View>
          ) : null}
          {kind === 'lift' ? (
            <View style={styles.pair}>
              <Field label="REPS" value={reps} onChange={setReps} placeholder="5" numeric />
              <Field label="LOAD" value={target} onChange={setTarget} placeholder="Optional" numeric />
            </View>
          ) : null}
          {kind === 'weight' || kind === 'lift' ? <UnitToggle unit={unit} onChange={setUnit} /> : null}
          <DateDial days={horizon} onChange={setHorizon} />
          {kind === 'weight' ? <Text style={styles.note}>Stays on your account. Nobody else sees it.</Text> : null}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <PressableScale onPress={onCancel} containerStyle={{ flex: 1 }} style={styles.cancel} scaleTo={0.98} accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>CANCEL</Text>
        </PressableScale>
        <PressableScale
          onPress={save}
          disabled={busy || blocked}
          containerStyle={{ flex: 1 }}
          style={[styles.setGoal, (busy || blocked) && { opacity: 0.5 }]}
          scaleTo={0.98}
          accessibilityLabel="Set goal"
        >
          <Text style={styles.setGoalText}>{busy ? 'SAVING' : 'SET GOAL'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedDark}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="sentences"
        style={styles.input}
      />
    </View>
  );
}

function UnitToggle({ unit, onChange }: { unit: WeightUnit; onChange: (unit: WeightUnit) => void }) {
  return (
    <View style={styles.units}>
      {(['lb', 'kg'] as const).map((option) => {
        const active = option === unit;
        return (
          <PressableScale
            key={option}
            onPress={() => onChange(option)}
            containerStyle={{ flex: 1 }}
            style={[styles.unit, active && styles.unitActive]}
            scaleTo={0.98}
            accessibilityLabel={option}
          >
            <Text style={[styles.unitText, active && { color: colors.black }]}>{option.toUpperCase()}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function DateDial({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  const iso = addDays(days);
  const left = daysUntil(iso);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.dial}>
        <PressableScale onPress={() => onChange(Math.max(7, days - 7))} style={styles.step} scaleTo={0.94} accessibilityLabel="Sooner">
          <Ionicons name="chevron-back" size={18} color={colors.white} />
        </PressableScale>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.fieldLabel}>BY</Text>
          <Text style={styles.dialDate}>{formatDay(iso)}</Text>
          <Text style={styles.kindSub}>{Math.round(left / 7)} WEEKS</Text>
        </View>
        <PressableScale onPress={() => onChange(Math.min(730, days + 7))} style={styles.step} scaleTo={0.94} accessibilityLabel="Later">
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </PressableScale>
      </View>
      <View style={styles.presets}>
        {[28, 56, 84].map((option) => {
          const active = option === days;
          return (
            <PressableScale
              key={option}
              onPress={() => onChange(option)}
              containerStyle={{ flex: 1 }}
              style={[styles.preset, active && styles.unitActive]}
              scaleTo={0.98}
              accessibilityLabel={`${option / 7} weeks`}
            >
              <Text style={[styles.unitText, active && { color: colors.black }]}>{option / 7} WKS</Text>
            </PressableScale>
          );
        })}
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
    paddingHorizontal: 16,
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
  hero: { paddingHorizontal: 20, marginBottom: 18 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 56, lineHeight: 72, marginTop: 2 },
  lead: { fontFamily: fonts.medium, color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6 },
  panel: {
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  panelKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2 },
  panelTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 32, lineHeight: 40 },
  goalTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  stat: { alignItems: 'flex-end' },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 32, lineHeight: 40 },
  statUnit: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.4 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.yellow },
  hint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14, lineHeight: 20 },
  note: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { fontFamily: fonts.medium, color: colors.red, fontSize: 13, lineHeight: 18 },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindLabel: { fontFamily: fonts.black, color: colors.white, fontSize: 13, letterSpacing: 1.2 },
  kindSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  fieldLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.6 },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    fontFamily: fonts.semibold,
    color: colors.white,
    fontSize: 16,
  },
  pair: { flexDirection: 'row', gap: 8 },
  units: { flexDirection: 'row', gap: 8 },
  unit: {
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitActive: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  unitText: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1.2 },
  dial: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialDate: { fontFamily: fonts.display, color: colors.white, fontSize: 28, lineHeight: 34 },
  presets: { flexDirection: 'row', gap: 8 },
  preset: {
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: fonts.display, color: colors.white, fontSize: 48, lineHeight: 58 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancel: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1.2 },
  setGoal: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setGoalText: { fontFamily: fonts.black, color: colors.black, fontSize: 12, letterSpacing: 1.2 },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveMark: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveMarkText: { fontFamily: fonts.black, color: colors.black, fontSize: 12, letterSpacing: 1.2 },
  end: { alignSelf: 'flex-start', paddingVertical: 4 },
  endText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 1.4 },
});
