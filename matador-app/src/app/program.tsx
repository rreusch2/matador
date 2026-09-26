import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { WORKOUT_TYPES } from '@/context/fitness';
import {
  PROGRAM_MINUTES,
  WEEKDAYS,
  blankProgram,
  mondayIndex,
  programStore,
  saveProgram,
  useProgram,
  type Program,
  type ProgramDay,
  type ProgramMinutes,
} from '@/services/program';
import { FOCUS_OPTIONS, type Focus } from '@/services/workouts';
import { haptic } from '@/utils/haptics';

export default function ProgramScreen() {
  const insets = useSafeAreaInsets();
  const { program, loaded } = useProgram();
  const [draft, setDraft] = useState<Program>(blankProgram);
  const [open, setOpen] = useState(mondayIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      programStore.refresh();
    }, [])
  );

  useEffect(() => {
    if (program) setDraft(program);
  }, [program]);

  const patchDay = (index: number, patch: Partial<ProgramDay>) => {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    }));
  };

  const setRest = (index: number, rest: boolean) => {
    if (rest) patchDay(index, { rest: true, type: null, focus: null, minutes: null, note: '' });
    else patchDay(index, { rest: false, type: draft.days[index].type ?? 'strength', minutes: draft.days[index].minutes ?? 45, focus: draft.days[index].focus ?? 'full' });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveProgram(draft);
      setSaved(true);
      haptic.success();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That program did not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 120 }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.kicker}>THE WEEK</Text>
          <Text style={styles.title}>MY PROGRAM.</Text>
          <Text style={styles.lead}>Mark rest days and training days. Pick the kind of work for each one.</Text>
        </Animated.View>

        <View style={styles.body}>
          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => {
              setSaved(false);
              setDraft((current) => ({ ...current, name }));
            }}
            maxLength={40}
            placeholder="My Program"
            placeholderTextColor={colors.mutedDark}
            style={styles.name}
          />

          {draft.days.map((day, index) => (
            <Animated.View key={WEEKDAYS[index]} entering={FadeInDown.delay(index * 30).duration(280).easing(Easing.out(Easing.cubic))}>
              <DayEditor
                index={index}
                day={day}
                expanded={open === index}
                onToggle={() => setOpen(open === index ? -1 : index)}
                onRest={(rest) => setRest(index, rest)}
                onPatch={(patch) => patchDay(index, patch)}
              />
            </Animated.View>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loaded ? <Text style={styles.lead}>Loading your week.</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 14 }]}>
        <PressableScale
          onPress={save}
          disabled={busy}
          style={[styles.save, busy && { opacity: 0.5 }]}
          scaleTo={0.98}
          accessibilityLabel="Save program"
        >
          <Text style={styles.saveText}>{busy ? 'SAVING' : saved ? 'SAVED' : 'SAVE PROGRAM'}</Text>
        </PressableScale>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Back">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle}>MY PROGRAM</Text>
        <View style={{ width: 42 }} />
      </View>
    </View>
  );
}

function DayEditor({
  index,
  day,
  expanded,
  onToggle,
  onRest,
  onPatch,
}: {
  index: number;
  day: ProgramDay;
  expanded: boolean;
  onToggle: () => void;
  onRest: (rest: boolean) => void;
  onPatch: (patch: Partial<ProgramDay>) => void;
}) {
  const isToday = index === mondayIndex();
  const typeLabel = WORKOUT_TYPES.find((item) => item.key === day.type)?.label ?? 'Train';
  const focusLabel = FOCUS_OPTIONS.find((item) => item.key === day.focus)?.label;

  return (
    <View style={[styles.day, isToday && styles.dayToday]}>
      <PressableScale onPress={onToggle} style={styles.dayHead} scaleTo={0.99} accessibilityLabel={WEEKDAYS[index]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayKicker}>{isToday ? 'TODAY' : 'DAY'}</Text>
          <Text style={styles.dayName}>{WEEKDAYS[index].toUpperCase()}</Text>
        </View>
        <Text style={styles.daySummary}>
          {day.rest ? 'REST' : `${typeLabel.toUpperCase()}${focusLabel ? ` \u00B7 ${focusLabel.toUpperCase()}` : ''}`}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </PressableScale>

      {expanded ? (
        <View style={styles.editor}>
          <View style={styles.pair}>
            <Choice label="REST" active={day.rest} onPress={() => onRest(true)} />
            <Choice label="TRAIN" active={!day.rest} onPress={() => onRest(false)} />
          </View>
          {!day.rest ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.fieldLabel}>TYPE</Text>
              <View style={styles.chips}>
                {WORKOUT_TYPES.map((item) => (
                  <Chip
                    key={item.key}
                    label={item.label.toUpperCase()}
                    active={day.type === item.key}
                    onPress={() =>
                      onPatch({
                        type: item.key,
                        focus: item.key === 'strength' ? day.focus ?? 'full' : null,
                      })
                    }
                  />
                ))}
              </View>
              {day.type === 'strength' ? (
                <>
                  <Text style={styles.fieldLabel}>FOCUS</Text>
                  <View style={styles.chips}>
                    {FOCUS_OPTIONS.map((item) => (
                      <Chip
                        key={item.key}
                        label={item.label.toUpperCase()}
                        active={day.focus === item.key}
                        onPress={() => onPatch({ focus: item.key as Focus })}
                      />
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.fieldLabel}>MINUTES</Text>
              <View style={styles.chips}>
                {PROGRAM_MINUTES.map((minutes) => (
                  <Chip
                    key={minutes}
                    label={`${minutes}`}
                    active={day.minutes === minutes}
                    onPress={() => onPatch({ minutes: minutes as ProgramMinutes })}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>NOTE</Text>
              <TextInput
                value={day.note}
                onChangeText={(note) => onPatch({ note })}
                maxLength={40}
                placeholder="Easy, legs, long run"
                placeholderTextColor={colors.mutedDark}
                style={styles.note}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      containerStyle={{ flex: 1 }}
      style={[styles.choice, active && styles.choiceOn]}
      scaleTo={0.98}
      accessibilityLabel={label}
    >
      <Text style={[styles.choiceText, active && { color: colors.black }]}>{label}</Text>
    </PressableScale>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={[styles.chip, active && styles.choiceOn]} scaleTo={0.97} accessibilityLabel={label}>
      <Text style={[styles.chipText, active && { color: colors.black }]}>{label}</Text>
    </PressableScale>
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
  hero: { paddingHorizontal: 20, marginBottom: 16 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 52, lineHeight: 66, marginTop: 2 },
  lead: { fontFamily: fonts.medium, color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6 },
  body: { paddingHorizontal: 20, gap: 10 },
  fieldLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.6 },
  name: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.semibold,
    color: colors.white,
    fontSize: 16,
    marginBottom: 6,
  },
  day: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dayToday: { borderColor: 'rgba(254,219,0,0.45)' },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dayKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 9, letterSpacing: 1.6 },
  dayName: { fontFamily: fonts.display, color: colors.white, fontSize: 22, lineHeight: 28 },
  daySummary: { fontFamily: fonts.black, color: colors.muted, fontSize: 10, letterSpacing: 1, maxWidth: 140, textAlign: 'right' },
  editor: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  pair: { flexDirection: 'row', gap: 8 },
  choice: {
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  choiceText: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 0.8 },
  note: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 14,
  },
  error: { fontFamily: fonts.medium, color: colors.red, fontSize: 13 },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  save: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontFamily: fonts.black, color: colors.black, fontSize: 14, letterSpacing: 1.4 },
});
