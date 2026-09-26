import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRevealed } from '@/components/AnimatedSplash';
import { Logo } from '@/components/Logo';
import { PressableScale, Reveal } from '@/components/ui';
import { AUTH_BRAND, LOGO_ASPECT, colors, fonts, radius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { haptic } from '@/utils/haptics';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;
const LOGO_W = AUTH_BRAND.logoWidth;
const LOGO_H = LOGO_W / LOGO_ASPECT;
const layout = LinearTransition.duration(260).easing(Easing.out(Easing.cubic));

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = EMAIL_RE.test(cleanEmail);
  const passwordPart = Math.min(password.length / MIN_PASSWORD, 1);
  const confirmOk = confirm.length > 0 && confirm === password;
  const parts =
    mode === 'signup' ? [emailOk ? 1 : 0, passwordPart, confirmOk ? 1 : 0] : [emailOk ? 1 : 0, passwordPart];
  const progress = notice ? 1 : parts.reduce((a, b) => a + b, 0) / parts.length;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    haptic.select();
    setMode(next);
    setError(null);
  };

  const submit = async () => {
    if (busy) return;
    if (!emailOk) return setError('Enter a valid email address.');
    if (mode === 'signup' && password.length < MIN_PASSWORD)
      return setError(`Password needs at least ${MIN_PASSWORD} characters.`);
    if (!password) return setError('Enter your password.');
    if (mode === 'signup' && !confirm) return setError('Confirm your password.');
    if (mode === 'signup' && confirm !== password) return setError('Those passwords do not match.');

    setBusy(true);
    setError(null);
    if (mode === 'signin') {
      const err = await signIn(cleanEmail, password);
      if (err) setError(err);
      else haptic.success();
    } else {
      const res = await signUp({ email: cleanEmail, password, marketing });
      if (res.error) setError(res.error);
      else {
        haptic.success();
        if (res.needsConfirmation) {
          setNotice({
            title: 'CHECK YOUR INBOX.',
            body: `We sent a confirmation link to ${cleanEmail}. Tap it, then come back here and sign in.`,
          });
        }
      }
    }
    setBusy(false);
  };

  const forgot = async () => {
    if (!emailOk) {
      setError('Enter your email above and we\'ll send you a reset link.');
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    const err = await resetPassword(cleanEmail);
    setBusy(false);
    if (err) setError(err);
    else setNotice({ title: 'RESET LINK SENT.', body: `Check ${cleanEmail} for a link to set a new password.` });
  };

  const backToSignIn = () => {
    setNotice(null);
    setMode('signin');
    setPassword('');
    setConfirm('');
    setError(null);
  };

  return (
    <View style={styles.screen}>
      <Watermark />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + AUTH_BRAND.top,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 24,
            flexGrow: 1,
          }}
        >
          <ChargeLogo progress={progress} busy={busy} />

          {notice ? (
            <Animated.View key="notice" entering={FadeIn.duration(300)} style={styles.notice}>
              <View style={styles.noticeIcon}>
                <Ionicons name="mail-open-outline" size={28} color={colors.black} />
              </View>
              <Text style={styles.title}>{notice.title}</Text>
              <Text style={styles.subtitle}>{notice.body}</Text>
              <PressableScale
                onPress={backToSignIn}
                containerStyle={{ alignSelf: 'stretch' }}
                style={[styles.submit, { marginTop: 28 }]}
              >
                <Text style={styles.submitText}>BACK TO SIGN IN</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.black} />
              </PressableScale>
            </Animated.View>
          ) : (
            <View key="form" style={{ flex: 1 }}>
              <Reveal delay={120} from={16}>
                <Text style={styles.kicker}>{mode === 'signin' ? 'MATADOR MEMBERS' : 'NEW TO MATADOR'}</Text>
                <Text style={styles.title}>{mode === 'signin' ? 'WELCOME BACK.' : 'JOIN THE HERD.'}</Text>
                <View style={styles.rule} />
              </Reveal>

              <Reveal delay={220} from={16}>
                <ModeToggle mode={mode} onChange={switchMode} />
              </Reveal>

              <Reveal delay={320} from={16}>
                <Animated.View layout={layout} style={{ gap: 14 }}>
                  <Animated.View layout={layout}>
                    <Field
                      ref={emailRef}
                      label="EMAIL"
                      icon="mail-outline"
                      value={email}
                      onChangeText={setEmail}
                      valid={emailOk}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </Animated.View>

                  <Animated.View layout={layout}>
                    <Field
                      ref={passwordRef}
                      label="PASSWORD"
                      icon="lock-closed-outline"
                      value={password}
                      onChangeText={setPassword}
                      valid={mode === 'signup' ? password.length >= MIN_PASSWORD : undefined}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                      returnKeyType={mode === 'signup' ? 'next' : 'go'}
                      onSubmitEditing={() => (mode === 'signup' ? confirmRef.current?.focus() : submit())}
                      trailing={
                        <Pressable
                          onPress={() => setShowPassword((s) => !s)}
                          hitSlop={10}
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                        </Pressable>
                      }
                    />
                    {mode === 'signup' ? (
                      <Text style={styles.hint}>{MIN_PASSWORD}+ characters</Text>
                    ) : (
                      <Pressable onPress={forgot} hitSlop={8} style={styles.forgot}>
                        <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
                      </Pressable>
                    )}
                  </Animated.View>

                  {mode === 'signup' && (
                    <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} layout={layout}>
                      <Field
                        ref={confirmRef}
                        label="CONFIRM PASSWORD"
                        icon="lock-closed-outline"
                        value={confirm}
                        onChangeText={setConfirm}
                        valid={confirmOk}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="go"
                        onSubmitEditing={submit}
                        trailing={
                          <Pressable
                            onPress={() => setShowPassword((s) => !s)}
                            hitSlop={10}
                            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                          >
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                          </Pressable>
                        }
                      />
                    </Animated.View>
                  )}

                  {mode === 'signup' && (
                    <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)}>
                      <Pressable onPress={() => setMarketing((m) => !m)} style={styles.optIn} hitSlop={6}>
                        <View style={[styles.check, marketing && styles.checkOn]}>
                          {marketing && <Ionicons name="checkmark" size={14} color={colors.black} />}
                        </View>
                        <Text style={styles.optInText}>Send me new drops, restocks and member-only deals.</Text>
                      </Pressable>
                    </Animated.View>
                  )}

                  {error && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
                      <Ionicons name="alert-circle" size={18} color={colors.red} />
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  )}

                  <Animated.View layout={layout}>
                    <PressableScale
                      onPress={submit}
                      disabled={busy}
                      style={[styles.submit, { marginTop: 6 }]}
                      accessibilityLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
                    >
                      {busy ? (
                        <ActivityIndicator color={colors.black} />
                      ) : (
                        <>
                          <Text style={styles.submitText}>{mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
                          <Ionicons name="arrow-forward" size={18} color={colors.black} />
                        </>
                      )}
                    </PressableScale>
                  </Animated.View>
                </Animated.View>
              </Reveal>

              <View style={{ flex: 1 }} />

              <Reveal delay={420} from={10}>
                <Pressable onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.switchRow} hitSlop={8}>
                  <Text style={styles.switchText}>
                    {mode === 'signin' ? 'New here? ' : 'Already a member? '}
                    <Text style={styles.switchLink}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</Text>
                  </Text>
                </Pressable>
                <Text style={styles.legal}>
                  By continuing you agree to Matador's Terms of Service and Privacy Policy.
                </Text>
              </Reveal>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * The hero logo doubles as a charge meter. It arrives fully gold from the splash, drains,
 * then fills back up as the form is completed.
 */
function ChargeLogo({ progress, busy }: { progress: number; busy: boolean }) {
  const revealed = useRevealed();
  const fill = useSharedValue(1);
  const pulse = useSharedValue(0);
  const pop = useSharedValue(1);
  const drained = useRef(false);
  const wasFull = useRef(true);

  useEffect(() => {
    if (!revealed) return;
    const delay = drained.current ? 0 : 450;
    drained.current = true;
    fill.value = withDelay(
      delay,
      withTiming(progress, { duration: delay ? 900 : 420, easing: Easing.inOut(Easing.cubic) })
    );
    const full = progress >= 1;
    if (full && !wasFull.current) {
      haptic.tap();
      pop.value = withSequence(
        withTiming(1.05, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) })
      );
    }
    wasFull.current = full;
  }, [revealed, progress]);

  useEffect(() => {
    if (busy) {
      pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 250 });
    }
  }, [busy]);

  const fillStyle = useAnimatedStyle(() => ({ height: fill.value * LOGO_H }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value * (1 + pulse.value * 0.03) }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + fill.value * 0.45 + pulse.value * 0.3,
    transform: [{ scale: 0.8 + fill.value * 0.4 + pulse.value * 0.2 }],
  }));

  return (
    <View style={styles.logoWrap}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[{ width: LOGO_W, height: LOGO_H }, logoStyle]}>
        <Logo width={LOGO_W} color="white" />
        <Animated.View style={[styles.fill, fillStyle]}>
          <Logo width={LOGO_W} color="yellow" style={styles.fillLogo} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** Oversized mark drifting slowly behind everything. */
function Watermark() {
  const { width } = useWindowDimensions();
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * -18 }, { translateY: drift.value * 12 }, { rotate: '-12deg' }],
  }));

  const w = width * 1.5;
  return (
    <Animated.View pointerEvents="none" style={[styles.watermark, { right: -w * 0.42, bottom: -w * 0.12 }, style]}>
      <Logo width={w} color="white" />
    </Animated.View>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(mode === 'signin' ? 0 : 1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [mode]);

  const slider = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (w / 2) }] }));

  return (
    <View style={styles.toggle} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)}>
      {w > 0 && <Animated.View style={[styles.toggleSlider, { width: w / 2 }, slider]} />}
      {(['signin', 'signup'] as const).map((m) => (
        <Pressable key={m} style={styles.toggleItem} onPress={() => onChange(m)} accessibilityRole="button">
          <Text style={[styles.toggleText, mode === m && { color: colors.black }]}>
            {m === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  valid?: boolean;
  trailing?: ReactNode;
};

const Field = forwardRef<TextInput, FieldProps>(function Field({ label, icon, valid, trailing, ...input }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Ionicons name={icon} size={18} color={focused ? colors.yellow : colors.muted} />
        <TextInput
          ref={ref}
          {...input}
          style={styles.input}
          placeholderTextColor={colors.mutedDark}
          selectionColor={colors.yellow}
          cursorColor={colors.yellow}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {valid && !trailing && <Ionicons name="checkmark-circle" size={18} color={colors.yellow} />}
        {trailing}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black, overflow: 'hidden' },
  watermark: { position: 'absolute', opacity: 0.045 },
  logoWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  glow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(254, 219, 0, 0.2)',
    boxShadow: '0 0 90px 60px rgba(254, 219, 0, 0.16)',
  },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  fillLogo: { position: 'absolute', left: 0, bottom: 0 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3, marginBottom: 8 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 44, lineHeight: 60, letterSpacing: 0.5 },
  rule: { width: 42, height: 3, borderRadius: 2, backgroundColor: colors.yellow, marginTop: 14 },
  subtitle: { fontFamily: fonts.medium, color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  toggle: {
    flexDirection: 'row',
    marginTop: 22,
    marginBottom: 22,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleSlider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
  },
  toggleItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontFamily: fonts.black, color: colors.muted, fontSize: 12, letterSpacing: 1.5 },
  fieldLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fieldFocused: { borderColor: colors.yellow, backgroundColor: '#15140A' },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.white,
    outlineWidth: 0,
  },
  hint: { fontFamily: fonts.medium, color: colors.mutedDark, fontSize: 12, marginTop: 8, marginLeft: 4 },
  forgot: { alignSelf: 'flex-end', marginTop: 10, marginRight: 4 },
  forgotText: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 1.5 },
  optIn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  optInText: { flex: 1, fontFamily: fonts.medium, color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(239, 51, 64, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 51, 64, 0.35)',
  },
  errorText: { flex: 1, fontFamily: fonts.semibold, color: colors.white, fontSize: 13, lineHeight: 18 },
  submit: {
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: { fontFamily: fonts.black, color: colors.black, fontSize: 15, letterSpacing: 1.5 },
  switchRow: { alignSelf: 'center', marginTop: 28 },
  switchText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  switchLink: { fontFamily: fonts.bold, color: colors.yellow },
  legal: {
    fontFamily: fonts.regular,
    color: colors.mutedDark,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
  notice: { alignItems: 'flex-start', marginTop: 10 },
  noticeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
