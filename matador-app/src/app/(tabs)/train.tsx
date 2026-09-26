import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Dimensions,
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivitySession } from '@/components/ActivitySession';
import { BrandHeader } from '@/components/BrandHeader';
import { Logo } from '@/components/Logo';
import { SessionRow, useSavedPlans } from '@/components/SessionRow';
import { Button, PressableScale, Reveal } from '@/components/ui';
import { WorkoutBuilderCard } from '@/components/WorkoutBuilderCard';
import { TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { WORKOUT_TYPES, startOfDay, useFitness, type WorkoutType } from '@/context/fitness';
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
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40 }}
      >
        <BrandHeader pinned={false} />
        <Reveal style={{ paddingHorizontal: 20 }}>
          <Text style={styles.kicker}>MATADOR PERFORMANCE</Text>
          <Text style={styles.title}>TRAIN.</Text>
          <Text style={styles.date}>{today}</Text>
        </Reveal>

        <View style={styles.rule} />

        <Reveal delay={60} style={{ marginTop: 22 }}>
          <ActivityCard onLog={() => setLogOpen(true)} />
        </Reveal>

        <Reveal delay={120}>
          <WorkoutBuilderCard />
        </Reveal>

        <Reveal delay={180}>
          <SavedSessionsCard />
        </Reveal>

        <Reveal delay={220}>
          <PressableScale
            onPress={() => router.push('/exercises')}
            style={styles.libraryBtn}
            scaleTo={0.98}
            accessibilityLabel="Exercises"
          >
            <View style={styles.libraryIcon}>
              <Ionicons name="library" size={22} color={colors.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.libraryTitle}>EXERCISES</Text>
              <Text style={styles.librarySub}>Demos, muscles, and how each move works</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.yellow} />
          </PressableScale>
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
    <View style={[styles.card, styles.activityCard]}>
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
          <View style={{ gap: 6 }}>
            {recent.map((workout) => (
              <ActivitySession key={workout.id} compact workout={workout} onRemove={() => removeWorkout(workout.id)} />
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.emptyActivity}>Log a session and it will land here.</Text>
      )}

      <Button label="LOG WORKOUT" icon="add" onPress={onLog} style={styles.logButton} />
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
const MINUTES_ACCESSORY = 'log-workout-minutes';
const HALF_DAY = 12 * 60 * 60 * 1000;

function yesterdayStart(today = startOfDay(Date.now())) {
  return startOfDay(today - HALF_DAY);
}

/** Past days keep the current clock time so the log still has an hour, without landing in the future. */
function performedAt(dayStart: number) {
  if (dayStart === startOfDay(Date.now())) return Date.now();
  const now = new Date();
  const at = new Date(dayStart);
  at.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return Math.min(at.getTime(), Date.now());
}

function MonthCalendar({
  value,
  today,
  onChange,
}: {
  value: number;
  today: number;
  onChange: (dayStart: number) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(value);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const now = new Date();
  const atCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    if (delta > 0 && atCurrentMonth) return;
    haptic.select();
    const next = new Date(year, month + delta, 1);
    next.setHours(0, 0, 0, 0);
    setCursor(next);
  };

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => shift(-1)} hitSlop={8} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={18} color={colors.white} />
        </Pressable>
        <Text style={styles.calendarTitle}>
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
        </Text>
        <Pressable onPress={() => shift(1)} hitSlop={8} disabled={atCurrentMonth} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={18} color={atCurrentMonth ? colors.mutedDark : colors.white} />
        </Pressable>
      </View>
      <View style={styles.calendarGrid}>
        {DAY_LETTERS.map((letter, i) => (
          <Text key={`${letter}-${i}`} style={styles.calendarDow}>
            {letter}
          </Text>
        ))}
        {cells.map((cell, i) => {
          if (cell == null) return <View key={`empty-${i}`} style={styles.calendarDay} />;
          const future = cell > today;
          const selected = cell === value;
          return (
            <Pressable
              key={cell}
              disabled={future}
              onPress={() => onChange(cell)}
              style={styles.calendarDay}
              accessibilityRole="button"
              accessibilityLabel={new Date(cell).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              accessibilityState={{ selected, disabled: future }}
            >
              <View style={[styles.calendarDot, selected && styles.calendarDotSelected]}>
                <Text
                  style={[
                    styles.calendarDayText,
                    cell === today && !selected && { color: colors.yellow },
                    selected && { color: colors.black },
                    future && { color: colors.mutedDark },
                  ]}
                >
                  {new Date(cell).getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LogWorkoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { logWorkout } = useFitness();
  const scrollRef = useRef<ScrollView>(null);
  const [type, setType] = useState<WorkoutType>('strength');
  const [minutes, setMinutes] = useState(45);
  const [custom, setCustom] = useState('');
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const dragY = useSharedValue(1000);
  const scrollOffset = useSharedValue(0);
  const closing = useSharedValue(false);
  const touchStartY = useSharedValue(0);
  const contentActive = useSharedValue(false);

  useEffect(() => {
    if (!visible) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [visible]);

  const todayStart = startOfDay(Date.now());
  const priorStart = yesterdayStart(todayStart);
  const isToday = day === todayStart;
  const isYesterday = day === priorStart;
  const isOtherDay = !isToday && !isYesterday;
  const otherLabel = isOtherDay
    ? new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    : 'DATE';

  const usingCustom = custom.trim().length > 0;
  const customMinutes = Number(custom);
  const resolved = usingCustom ? customMinutes : minutes;
  const canSave = Number.isInteger(resolved) && resolved >= 1 && resolved <= 600 && day <= todayStart;

  const finishClose = useCallback(() => {
    Keyboard.dismiss();
    setCustom('');
    setDay(startOfDay(Date.now()));
    setShowCalendar(false);
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    if (closing.value) return;
    closing.value = true;
    Keyboard.dismiss();
    dragY.value = withTiming(height + 80, { duration: 220, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  }, [closing, dragY, finishClose, height]);

  useEffect(() => {
    if (!visible) return;
    closing.value = false;
    scrollOffset.value = 0;
    dragY.value = height;
    dragY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [visible, closing, dragY, height, scrollOffset]);

  const settle = useCallback(
    (velocityY: number) => {
      'worklet';
      if (closing.value) return;
      const shouldClose = dragY.value > 90 || velocityY > 1100;
      if (shouldClose) {
        closing.value = true;
        dragY.value = withTiming(height + 80, { duration: 200, easing: Easing.out(Easing.cubic) }, (done) => {
          if (done) runOnJS(finishClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      }
    },
    [closing, dragY, finishClose, height]
  );

  const headerPan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      if (closing.value) return;
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      settle(e.velocityY);
    });

  const contentPan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e) => {
      contentActive.value = false;
      touchStartY.value = e.allTouches[0]?.absoluteY ?? 0;
    })
    .onTouchesMove((e, manager) => {
      if (closing.value || scrollOffset.value > 1) {
        manager.fail();
        return;
      }
      const dy = (e.allTouches[0]?.absoluteY ?? touchStartY.value) - touchStartY.value;
      if (dy > 12) {
        contentActive.value = true;
        manager.activate();
      } else if (dy < -8) manager.fail();
    })
    .onTouchesUp((_, manager) => {
      if (!contentActive.value) manager.fail();
    })
    .onUpdate((e) => {
      if (closing.value || scrollOffset.value > 1) return;
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (dragY.value <= 0) return;
      settle(e.velocityY);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, height * 0.55], [1, 0], Extrapolation.CLAMP),
  }));

  const pickDay = (next: number) => {
    if (next > todayStart) return;
    Keyboard.dismiss();
    haptic.select();
    setDay(next);
    setShowCalendar(false);
  };

  const save = () => {
    if (!canSave) return;
    logWorkout(type, resolved, { at: performedAt(day) });
    haptic.success();
    close();
  };

  const windowAlreadyShrunk = Dimensions.get('screen').height - height > 120;
  const lift = windowAlreadyShrunk ? 0 : keyboardHeight;
  const scrollMax = Math.max(180, height - lift - insets.top - insets.bottom - 150);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={[styles.sheetWrap, lift > 0 && { paddingBottom: lift }]}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropFill} onPress={close} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle, { maxHeight: height - lift - insets.top - 12, paddingBottom: lift > 0 ? 16 : insets.bottom + 20 }]}>
        <GestureDetector gesture={headerPan}>
          <View style={styles.grabberHit} accessibilityRole="adjustable" accessibilityLabel="Swipe down to close">
            <View style={styles.grabber} />
          </View>
        </GestureDetector>
        <GestureDetector gesture={contentPan}>
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: scrollMax }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
        >
        <Text style={styles.cardKicker}>NICE WORK</Text>
        <Text style={[styles.cardTitle, { fontSize: 34, lineHeight: 42 }]}>LOG WORKOUT</Text>

        <Text style={[styles.metaLabel, { marginTop: 18 }]}>WHEN</Text>
        <View style={styles.whenRow}>
          <Pressable
            onPress={() => pickDay(todayStart)}
            style={[styles.whenChip, isToday && styles.presetChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isToday }}
          >
            <Text style={[styles.whenText, isToday && { color: colors.yellow }]}>TODAY</Text>
          </Pressable>
          <Pressable
            onPress={() => pickDay(priorStart)}
            style={[styles.whenChip, isYesterday && styles.presetChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isYesterday }}
          >
            <Text style={[styles.whenText, isYesterday && { color: colors.yellow }]}>YESTERDAY</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              haptic.select();
              setShowCalendar((open) => !open);
            }}
            style={[styles.whenChip, (isOtherDay || showCalendar) && styles.presetChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isOtherDay || showCalendar }}
            accessibilityLabel="Choose a past date"
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={isOtherDay || showCalendar ? colors.yellow : colors.white}
            />
            <Text style={[styles.whenText, (isOtherDay || showCalendar) && { color: colors.yellow }]}>{otherLabel}</Text>
          </Pressable>
        </View>
        {showCalendar ? <MonthCalendar value={day} today={todayStart} onChange={pickDay} /> : null}

        <Text style={[styles.metaLabel, { marginTop: 18 }]}>TYPE</Text>
        <View style={styles.typeGrid}>
          {WORKOUT_TYPES.map((t) => {
            const active = t.key === type;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  Keyboard.dismiss();
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
                  Keyboard.dismiss();
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
            onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
            placeholder="Custom minutes"
            placeholderTextColor={colors.mutedDark}
            keyboardType="number-pad"
            inputMode="numeric"
            enterKeyHint="done"
            returnKeyType="done"
            blurOnSubmit
            maxLength={3}
            inputAccessoryViewID={Platform.OS === 'ios' ? MINUTES_ACCESSORY : undefined}
            onSubmitEditing={Keyboard.dismiss}
            style={styles.customInput}
            selectionColor={colors.yellow}
            cursorColor={colors.yellow}
            accessibilityLabel="Custom duration in minutes"
          />
          <Text style={[styles.durationUnit, usingCustom && { color: colors.yellow }]}>MIN</Text>
          {keyboardHeight > 0 ? (
            <Pressable onPress={Keyboard.dismiss} hitSlop={8} accessibilityLabel="Dismiss keyboard">
              <Text style={styles.accessoryText}>DONE</Text>
            </Pressable>
          ) : null}
        </View>
        {usingCustom && !canSave && <Text style={styles.customHint}>Use 1 to 600 minutes.</Text>}
        </ScrollView>
        </GestureDetector>

        <Button
          label="SAVE WORKOUT"
          icon="checkmark"
          onPress={() => {
            Keyboard.dismiss();
            save();
          }}
          disabled={!canSave}
          style={{ marginTop: 16 }}
        />
      </Animated.View>
      </GestureHandlerRootView>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={MINUTES_ACCESSORY}>
          <View style={styles.accessory}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={8} accessibilityLabel="Dismiss keyboard">
              <Text style={styles.accessoryText}>DONE</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </Modal>
  );
}

/* -------------------------------------- Styles -------------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 56, lineHeight: 72, marginTop: 2 },
  date: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 2 },
  libraryBtn: {
    marginHorizontal: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  libraryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryTitle: { fontFamily: fonts.black, color: colors.white, fontSize: 15, letterSpacing: 1.6 },
  librarySub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginTop: 3 },
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
  activityCard: { padding: 16 },
  bigNumber: { fontFamily: fonts.display, color: colors.white, fontSize: 34, lineHeight: 42 },
  bigUnit: { fontFamily: fonts.display, color: colors.mutedDark, fontSize: 18 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  stat: { flex: 1 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 1.8, marginTop: -2 },
  statRule: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 16 },

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
  chart: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, height: 112, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 4, borderRadius: 12 },
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
  barLabel: { fontFamily: fonts.black, color: colors.muted, fontSize: 10, marginBottom: 4 },
  sessionBlock: { marginTop: 12, gap: 8 },
  emptyActivity: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginTop: 12 },
  logButton: { marginTop: 12, height: 48 },

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
  grabberHit: { alignItems: 'center', paddingTop: 6, paddingBottom: 14 },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderBright,
  },
  backdropFill: { flex: 1 },
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
  whenRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  whenChip: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whenText: { fontFamily: fonts.black, color: colors.white, fontSize: 10, letterSpacing: 1.1 },
  calendar: {
    marginTop: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarTitle: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 1.4 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDow: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: fonts.black,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  calendarDay: { width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center' },
  calendarDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calendarDotSelected: { backgroundColor: colors.yellow },
  calendarDayText: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
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
  accessory: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  accessoryText: { fontFamily: fonts.black, color: colors.yellow, fontSize: 13, letterSpacing: 1.4 },
  customHint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 6 },

  footer: { alignItems: 'center', gap: 10, marginTop: 26, paddingHorizontal: 40 },
  footerText: { fontFamily: fonts.medium, color: colors.mutedDark, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
