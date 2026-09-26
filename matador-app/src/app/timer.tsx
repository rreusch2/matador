import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoVideo, videoHeight, youtubeId } from '@/components/DemoVideo';
import { Button, PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useFitness } from '@/context/fitness';
import { buildIntervalPhases, buildSessionPhases, type Phase } from '@/services/session';
import { markPlanCompleted, planStore } from '@/services/workouts';
import { haptic } from '@/utils/haptics';

const LOOK: Record<Phase['kind'], { fill: string; ink: string }> = {
  prep: { fill: colors.white, ink: colors.black },
  work: { fill: colors.yellow, ink: colors.black },
  rest: { fill: colors.blue, ink: colors.white },
  reps: { fill: colors.yellow, ink: colors.black },
};

const PLAIN_REPS = /^\d+(\s*-\s*\d+)?$/;

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function TimerScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { logWorkout } = useFitness();
  const params = useLocalSearchParams<{
    mode?: string;
    work?: string;
    rest?: string;
    rounds?: string;
    name?: string;
  }>();

  const session = params.mode === 'session';
  const [plan] = useState(() => (session ? planStore.get() : null));

  const work = Math.max(5, Number(params.work) || 20);
  const rest = Math.max(0, Number(params.rest) || 0);
  const rounds = Math.max(1, Number(params.rounds) || 8);
  const name = params.name ?? 'INTERVALS';

  const phases = useMemo<Phase[]>(
    () => (plan ? buildSessionPhases(plan) : buildIntervalPhases(name, work, rest, rounds)),
    [plan, name, work, rest, rounds]
  );

  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(phases[0].seconds * 1000);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [logged, setLogged] = useState(false);

  const indexRef = useRef(0);
  const phaseEnd = useRef(Date.now() + phases[0].seconds * 1000);
  const pausedLeft = useRef(0);
  const lastBeep = useRef(-1);
  const fill = useSharedValue(0);

  const phase = phases[index];
  const look = LOOK[phase.kind];
  const manual = phase.kind === 'reps';
  const showDemo = phase.kind !== 'prep' && !!youtubeId(phase.demo);
  const demoH = showDemo ? videoHeight(width) + 14 : 0;
  const totalSeconds = phases.reduce((sum, p) => sum + p.seconds, 0);

  const startFill = (fromMs: number, durationMs: number) => {
    cancelAnimation(fill);
    fill.value = 1 - fromMs / durationMs;
    fill.value = withTiming(1, { duration: fromMs, easing: Easing.linear });
  };

  useEffect(() => {
    startFill(phases[0].seconds * 1000, phases[0].seconds * 1000);
  }, []);

  /** Moves to the next phase. `carryMs` is the overshoot from the tick that triggered it. */
  const advance = useCallback(
    (carryMs = 0) => {
      const next = indexRef.current + 1;
      if (next >= phases.length) {
        setDone(true);
        setLeft(0);
        haptic.success();
        return;
      }
      const ms = phases[next].seconds * 1000;
      indexRef.current = next;
      phaseEnd.current = Date.now() + ms + carryMs;
      lastBeep.current = -1;
      setIndex(next);
      setLeft(ms);
      if (ms > 0) startFill(ms, ms);
      else {
        cancelAnimation(fill);
        fill.value = 0;
      }
      if (phases[next].kind === 'rest') haptic.medium();
      else haptic.heavy();
    },
    [phases]
  );

  useEffect(() => {
    if (paused || done || manual) return;
    const id = setInterval(() => {
      const remaining = phaseEnd.current - Date.now();
      if (remaining > 0) {
        setLeft(remaining);
        const sec = Math.ceil(remaining / 1000);
        if (sec <= 3 && sec !== lastBeep.current) {
          lastBeep.current = sec;
          haptic.tap();
        }
        return;
      }
      advance(remaining);
    }, 100);
    return () => clearInterval(id);
  }, [paused, done, manual, advance]);

  const togglePause = () => {
    if (paused) {
      phaseEnd.current = Date.now() + pausedLeft.current;
      startFill(pausedLeft.current, phase.seconds * 1000);
      setPaused(false);
    } else {
      pausedLeft.current = Math.max(0, phaseEnd.current - Date.now());
      cancelAnimation(fill);
      setPaused(true);
    }
  };

  const skip = () => {
    if (manual) {
      advance();
      return;
    }
    if (paused) {
      pausedLeft.current = 0;
      togglePause();
    }
    phaseEnd.current = Date.now();
  };

  const saveWorkout = () => {
    if (plan) {
      logWorkout(plan.logAs, plan.minutes);
      markPlanCompleted(plan.id);
    } else {
      logWorkout('hiit', Math.max(1, Math.round(totalSeconds / 60)));
    }
    setLogged(true);
    haptic.success();
  };

  const fillStyle = useAnimatedStyle(() => ({ height: fill.value * height }));

  const next = phases[index + 1];
  const nextLabel = next ? (next.kind === 'rest' ? 'REST' : next.title) : null;

  const content = (ink: string, dim: string) => (
    <View style={[styles.content, { width, height, paddingTop: insets.top + 70 + demoH }]}>
      <Text style={[styles.top, { color: dim }]} numberOfLines={1}>
        {phase.top}
      </Text>
      <Text
        style={[styles.title, showDemo && styles.titleWithVideo, { color: ink }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {phase.title}
      </Text>
      {manual ? (
        <>
          <Text style={[styles.reps, showDemo && styles.repsWithVideo, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
            {phase.reps}
          </Text>
          {PLAIN_REPS.test(phase.reps) && <Text style={[styles.repsLabel, { color: dim }]}>REPS</Text>}
        </>
      ) : (
        <Text
          style={[styles.clock, showDemo && styles.clockWithVideo, { color: ink }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {phase.seconds >= 60 ? formatClock(left / 1000) : Math.ceil(left / 1000)}
        </Text>
      )}
      <Text style={[styles.counter, { color: ink }]}>{phase.counter}</Text>
      {!!phase.cue && (
        <Text style={[styles.cue, { color: dim }]} numberOfLines={2}>
          {phase.cue}
        </Text>
      )}
      {nextLabel && (
        <Text style={[styles.next, { color: dim }]} numberOfLines={1}>
          NEXT {'\u00B7'} {nextLabel}
          {next && next.seconds > 0 ? ` ${next.seconds}s` : ''}
        </Text>
      )}
    </View>
  );

  if (session && !plan) {
    return (
      <View style={[styles.screen, styles.doneWrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 30 }]}>
        <Text style={styles.doneSub}>No session loaded. Open a workout and start it again.</Text>
        <Button label="CLOSE" variant="outline" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.screen, styles.doneWrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={34} color={colors.black} />
          </View>
          <Text style={styles.doneTitle}>DONE.</Text>
          <Text style={styles.doneSub}>
            {plan
              ? `${plan.title} \u00B7 ${plan.main.length} exercises \u00B7 ${plan.minutes} min`
              : `${name} \u00B7 ${rounds} rounds \u00B7 ${formatClock(totalSeconds)}`}
          </Text>
        </View>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          <Button
            label={logged ? 'LOGGED TO YOUR WEEK' : 'LOG THIS WORKOUT'}
            icon={logged ? 'checkmark-circle' : 'add-circle'}
            onPress={logged ? undefined : saveWorkout}
            disabled={logged}
          />
          <Button label="CLOSE" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {content(colors.white, colors.muted)}

      <Animated.View style={[styles.fill, { backgroundColor: look.fill }, fillStyle]}>
        <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
          {content(look.ink, look.ink === colors.black ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)')}
        </View>
      </Animated.View>

      {showDemo && (
        <View style={[styles.demoWrap, { top: insets.top + 62 }]} pointerEvents="none">
          <DemoVideo key={phase.demo ?? 'demo'} url={phase.demo} width={width} playing />
        </View>
      )}

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <PressableScale onPress={() => router.back()} style={styles.roundBtn} scaleTo={0.9} accessibilityLabel="Close timer">
          <Ionicons name="close" size={22} color={colors.white} />
        </PressableScale>
        <View style={styles.totalPill}>
          <Text style={styles.totalText}>
            {plan ? `${plan.minutes} MIN SESSION` : `${formatClock(totalSeconds)} TOTAL`}
          </Text>
        </View>
      </View>

      {manual ? (
        <View style={[styles.controlsWide, { bottom: insets.bottom + 34 }]}>
          <PressableScale onPress={() => advance()} style={styles.setDone} scaleTo={0.97} accessibilityLabel="Set complete">
            <Ionicons name="checkmark" size={22} color={colors.black} />
            <Text style={styles.setDoneText}>SET COMPLETE</Text>
          </PressableScale>
        </View>
      ) : (
        <View style={[styles.controls, { bottom: insets.bottom + 34 }]}>
          <PressableScale onPress={togglePause} style={styles.bigBtn} scaleTo={0.92} accessibilityLabel={paused ? 'Resume' : 'Pause'}>
            <Ionicons name={paused ? 'play' : 'pause'} size={30} color={colors.white} />
          </PressableScale>
          <PressableScale onPress={skip} style={styles.roundBtn} scaleTo={0.9} accessibilityLabel="Skip phase">
            <Ionicons name="play-skip-forward" size={20} color={colors.white} />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black, overflow: 'hidden' },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  top: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 3 },
  title: { fontFamily: fonts.display, fontSize: 44, lineHeight: 54, marginTop: 18, letterSpacing: 1, textAlign: 'center' },
  titleWithVideo: { fontSize: 32, lineHeight: 40, marginTop: 10 },
  clock: { fontFamily: fonts.display, fontSize: 160, lineHeight: 210, marginTop: 4 },
  clockWithVideo: { fontSize: 110, lineHeight: 140 },
  reps: { fontFamily: fonts.display, fontSize: 112, lineHeight: 150, marginTop: 4 },
  repsWithVideo: { fontSize: 84, lineHeight: 108 },
  demoWrap: { position: 'absolute', left: 0, right: 0, zIndex: 4 },
  repsLabel: { fontFamily: fonts.black, fontSize: 13, letterSpacing: 3, marginTop: -4, marginBottom: 8 },
  counter: { fontFamily: fonts.black, fontSize: 15, letterSpacing: 3 },
  cue: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 12 },
  next: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2, marginTop: 10 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
  totalText: { fontFamily: fonts.black, color: colors.white, fontSize: 11, letterSpacing: 1.5 },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingLeft: 70,
  },
  controlsWide: { position: 'absolute', left: 20, right: 20 },
  bigBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setDone: {
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  setDoneText: { fontFamily: fonts.black, color: colors.black, fontSize: 15, letterSpacing: 1.5 },
  doneWrap: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  doneBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  doneTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 84, lineHeight: 100, marginTop: 18 },
  doneSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 13, letterSpacing: 1.5, textAlign: 'center' },
});
