import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useFitness } from '@/context/fitness';
import { haptic } from '@/utils/haptics';

type Kind = 'prep' | 'work' | 'rest';
type Phase = { kind: Kind; seconds: number; round: number };

const PREP_SECONDS = 5;

const LOOK: Record<Kind, { label: string; fill: string; ink: string }> = {
  prep: { label: 'GET READY', fill: colors.white, ink: colors.black },
  work: { label: 'WORK', fill: colors.yellow, ink: colors.black },
  rest: { label: 'REST', fill: colors.blue, ink: colors.white },
};

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function TimerScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { logWorkout } = useFitness();
  const params = useLocalSearchParams<{ work?: string; rest?: string; rounds?: string; name?: string }>();
  const work = Math.max(5, Number(params.work) || 20);
  const rest = Math.max(0, Number(params.rest) || 0);
  const rounds = Math.max(1, Number(params.rounds) || 8);
  const name = params.name ?? 'INTERVALS';

  const phases = useMemo<Phase[]>(() => {
    const list: Phase[] = [{ kind: 'prep', seconds: PREP_SECONDS, round: 1 }];
    for (let r = 1; r <= rounds; r++) {
      list.push({ kind: 'work', seconds: work, round: r });
      if (rest > 0 && r < rounds) list.push({ kind: 'rest', seconds: rest, round: r });
    }
    return list;
  }, [work, rest, rounds]);
  const totalSeconds = rounds * work + (rounds - 1) * rest;

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

  const startFill = (fromMs: number, durationMs: number) => {
    cancelAnimation(fill);
    fill.value = 1 - fromMs / durationMs;
    fill.value = withTiming(1, { duration: fromMs, easing: Easing.linear });
  };

  useEffect(() => {
    startFill(phases[0].seconds * 1000, phases[0].seconds * 1000);
  }, []);

  useEffect(() => {
    if (paused || done) return;
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
      const next = indexRef.current + 1;
      if (next >= phases.length) {
        setDone(true);
        setLeft(0);
        haptic.success();
        return;
      }
      const ms = phases[next].seconds * 1000;
      indexRef.current = next;
      phaseEnd.current = Date.now() + ms + remaining;
      lastBeep.current = -1;
      setIndex(next);
      setLeft(ms);
      startFill(ms, ms);
      if (phases[next].kind === 'work') haptic.heavy();
      else haptic.medium();
    }, 100);
    return () => clearInterval(id);
  }, [paused, done, phases]);

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
    if (paused) {
      pausedLeft.current = 0;
      togglePause();
    }
    phaseEnd.current = Date.now();
  };

  const saveWorkout = () => {
    logWorkout('hiit', Math.max(1, Math.round(totalSeconds / 60)));
    setLogged(true);
    haptic.success();
  };

  const fillStyle = useAnimatedStyle(() => ({ height: fill.value * height }));

  const nextPhase = phases[index + 1];
  const content = (ink: string, dim: string) => (
    <View style={[styles.content, { width, height, paddingTop: insets.top + 70 }]}>
      <Text style={[styles.name, { color: dim }]}>{name}</Text>
      <Text style={[styles.phase, { color: ink }]}>{look.label}</Text>
      <Text style={[styles.clock, { color: ink }]} adjustsFontSizeToFit numberOfLines={1}>
        {phase.seconds >= 60 ? formatClock(left / 1000) : Math.ceil(left / 1000)}
      </Text>
      <Text style={[styles.round, { color: ink }]}>
        ROUND {phase.round} / {rounds}
      </Text>
      {nextPhase && (
        <Text style={[styles.next, { color: dim }]}>
          NEXT {'\u00B7'} {LOOK[nextPhase.kind].label} {nextPhase.seconds}s
        </Text>
      )}
    </View>
  );

  if (done) {
    return (
      <View style={[styles.screen, styles.doneWrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={34} color={colors.black} />
          </View>
          <Text style={styles.doneTitle}>DONE.</Text>
          <Text style={styles.doneSub}>
            {name} {'\u00B7'} {rounds} rounds {'\u00B7'} {formatClock(totalSeconds)}
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

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <PressableScale onPress={() => router.back()} style={styles.roundBtn} scaleTo={0.9} accessibilityLabel="Close timer">
          <Ionicons name="close" size={22} color={colors.white} />
        </PressableScale>
        <View style={styles.totalPill}>
          <Text style={styles.totalText}>{formatClock(totalSeconds)} TOTAL</Text>
        </View>
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + 34 }]}>
        <PressableScale onPress={togglePause} style={styles.bigBtn} scaleTo={0.92} accessibilityLabel={paused ? 'Resume' : 'Pause'}>
          <Ionicons name={paused ? 'play' : 'pause'} size={30} color={colors.white} />
        </PressableScale>
        <PressableScale onPress={skip} style={styles.roundBtn} scaleTo={0.9} accessibilityLabel="Skip phase">
          <Ionicons name="play-skip-forward" size={20} color={colors.white} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black, overflow: 'hidden' },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  name: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 3 },
  phase: { fontFamily: fonts.display, fontSize: 44, lineHeight: 54, marginTop: 18, letterSpacing: 2 },
  clock: { fontFamily: fonts.display, fontSize: 200, lineHeight: 236, marginTop: 4 },
  round: { fontFamily: fonts.black, fontSize: 15, letterSpacing: 3 },
  next: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2, marginTop: 10 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
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
  doneSub: { fontFamily: fonts.bold, color: colors.muted, fontSize: 13, letterSpacing: 1.5 },
});
