import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPLASH_LOGO_WHITE, SPLASH_LOGO_YELLOW } from '@/constants/splashLogos';
import { AUTH_BRAND, HEADER_BRAND, LOGO_ASPECT, colors } from '@/constants/theme';
import { haptic } from '@/utils/haptics';

/** Must match `imageWidth` of the expo-splash-screen plugin in app.json */
const LOGO_W = 200;
const LOGO_H = LOGO_W / LOGO_ASPECT;
/** How long the full white logo holds before it starts charging. */
const FILL_DELAY_MS = 700;
const FILL_MS = 1500;
/** The mark's body sits left of its bounding box center (horns are centered, the body is slanted). */
const BODY_CENTER = 0.44;

const RevealContext = createContext(false);

/** True once the intro animation has handed off to the app. */
export function useRevealed() {
  return useContext(RevealContext);
}

type Props = {
  /** Flip to true once fonts/assets/data are loaded. */
  ready: boolean;
  /** Where the logo lands: the home header, or the auth screen hero when signed out. */
  target?: 'header' | 'auth';
  children: ReactNode;
};

export function AnimatedSplash({ ready, target = 'header', children }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [logoPainted, setLogoPainted] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  const intro = useSharedValue(0);
  const breathe = useSharedValue(0);
  const charge = useSharedValue(0);
  const pop = useSharedValue(1);
  const fly = useSharedValue(0);
  const logoOpacity = useSharedValue(1);
  const bgOpacity = useSharedValue(1);
  const app = useSharedValue(0);

  useEffect(() => {
    const fallback = setTimeout(() => setLogoPainted(true), 800);
    return () => clearTimeout(fallback);
  }, []);

  // Phase 1 - the JS logo sits exactly where the native splash logo was, so the swap is
  // invisible. The logo itself is the loader: it fills with gold from the bottom up.
  useEffect(() => {
    if (!logoPainted) return;
    try {
      SplashScreen.hide();
    } catch {}
    intro.value = withTiming(1, { duration: 600 });
    breathe.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }), -1, true);
    charge.value = withDelay(
      FILL_DELAY_MS,
      withTiming(0.8, { duration: FILL_MS, easing: Easing.out(Easing.cubic) })
    );
    const t = setTimeout(() => setMinTimePassed(true), FILL_DELAY_MS + FILL_MS);
    return () => clearTimeout(t);
  }, [logoPainted]);

  // Phase 2 - fully charged: a small pop, then the logo glides into its spot in the header
  // while the app fades up underneath it.
  const go = ready && minTimePassed;
  useEffect(() => {
    if (!go) return;

    const FILL = 240;
    const FLY_AT = FILL + 220;
    const FLY = 720;
    const LAND = FLY_AT + FLY;

    charge.value = withTiming(1, { duration: FILL, easing: Easing.out(Easing.quad) });
    cancelAnimation(breathe);
    breathe.value = withTiming(0, { duration: 200 });
    pop.value = withDelay(
      FILL,
      withSequence(
        withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: Easing.inOut(Easing.quad) })
      )
    );
    fly.value = withDelay(FLY_AT, withTiming(1, { duration: FLY, easing: Easing.bezier(0.65, 0, 0.25, 1) }));
    bgOpacity.value = withDelay(FLY_AT + 120, withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }));
    app.value = withDelay(FLY_AT + 80, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    logoOpacity.value = withDelay(LAND, withTiming(0, { duration: 160 }));

    const timers = [
      setTimeout(() => haptic.tap(), FILL),
      setTimeout(() => setRevealed(true), FLY_AT + 200),
      setTimeout(() => haptic.select(), LAND - 40),
      setTimeout(() => setFinished(true), LAND + 220),
    ];
    return () => timers.forEach(clearTimeout);
  }, [go]);

  const logoLeft = (width - LOGO_W) / 2;
  const logoTop = (height - LOGO_H) / 2;

  const toAuth = target === 'auth';
  const endW = toAuth ? AUTH_BRAND.logoWidth : HEADER_BRAND.logoWidth;
  const endScale = endW / LOGO_W;
  const endX = toAuth ? width / 2 : HEADER_BRAND.left + endW / 2;
  const endY = toAuth
    ? insets.top + AUTH_BRAND.top + endW / LOGO_ASPECT / 2
    : insets.top + HEADER_BRAND.top + HEADER_BRAND.rowHeight / 2;
  const dx = endX - (logoLeft + LOGO_W / 2);
  const dy = endY - (logoTop + LOGO_H / 2);

  const appStyle = useAnimatedStyle(() => ({
    opacity: app.value,
    transform: [{ translateY: interpolate(app.value, [0, 1], [14, 0]) }],
  }));

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      intro.value * (0.2 + charge.value * 0.35 + breathe.value * 0.3) * (1 - fly.value) * logoOpacity.value,
    transform: [{ scale: 0.8 + charge.value * 0.35 + breathe.value * 0.2 + (pop.value - 1) * 5 }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { translateX: fly.value * dx },
      { translateY: fly.value * dy },
      { scale: interpolate(fly.value, [0, 1], [1, endScale]) * pop.value * (1 + breathe.value * 0.03) },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({ height: charge.value * LOGO_H }));

  const cx = logoLeft + LOGO_W * BODY_CENTER;
  const cy = height / 2;

  return (
    <RevealContext.Provider value={revealed}>
      <View style={styles.root}>
        {ready && <Animated.View style={[styles.root, appStyle]}>{children}</Animated.View>}

        {!finished && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: revealed ? 'none' : 'auto' }]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.bg, bgStyle]} />

            <Animated.View style={[styles.glow, { left: cx - 20, top: cy - 20 }, glowStyle]} />

            <Animated.View
              style={[
                { position: 'absolute', left: logoLeft, top: logoTop, width: LOGO_W, height: LOGO_H },
                logoStyle,
              ]}
            >
              <Image
                source={SPLASH_LOGO_WHITE}
                style={styles.logo}
                resizeMode="contain"
                fadeDuration={0}
                onLoad={() => requestAnimationFrame(() => setLogoPainted(true))}
              />
              <Animated.View style={[styles.fill, fillStyle]}>
                <Image source={SPLASH_LOGO_YELLOW} style={styles.fillLogo} resizeMode="contain" fadeDuration={0} />
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </View>
    </RevealContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  bg: { backgroundColor: colors.black },
  glow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(254, 219, 0, 0.2)',
    boxShadow: '0 0 120px 80px rgba(254, 219, 0, 0.2)',
  },
  logo: { width: LOGO_W, height: LOGO_H },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  fillLogo: { position: 'absolute', left: 0, bottom: 0, width: LOGO_W, height: LOGO_H },
});
