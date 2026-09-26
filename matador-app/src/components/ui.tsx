import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useRevealed } from '@/components/AnimatedSplash';
import { colors, fonts, radius } from '@/constants/theme';
import { haptic } from '@/utils/haptics';

type PressableScaleProps = {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Layout for the outer touch target (flex, % widths); `style` sizes the inner animated view. */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
  /** Use 'none' for containers that hold other buttons (web forbids nested <button>). */
  accessibilityRole?: 'button' | 'none';
};

export function PressableScale({
  onPress,
  children,
  style,
  containerStyle,
  scaleTo = 0.96,
  disabled,
  hapticFeedback = true,
  accessibilityLabel,
  accessibilityRole = 'button',
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      style={containerStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      onPress={() => {
        if (hapticFeedback) haptic.tap();
        onPress?.();
      }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Slides + fades children in once the splash has handed off to the app. */
export function Reveal({
  children,
  delay = 0,
  from = 28,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const revealed = useRevealed();
  const v = useSharedValue(0);

  useEffect(() => {
    if (revealed) {
      v.value = withDelay(delay, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    }
  }, [revealed]);

  const animated = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * from }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  textStyle,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'light';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: colors.yellow, fg: colors.black, border: colors.yellow },
    dark: { bg: colors.black, fg: colors.white, border: colors.black },
    outline: { bg: 'transparent', fg: colors.white, border: colors.borderBright },
    light: { bg: colors.white, fg: colors.black, border: colors.white },
  }[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: palette.fg }, textStyle]}>{label}</Text>
      {icon && <Ionicons name={icon} size={18} color={palette.fg} style={{ marginLeft: 8 }} />}
    </PressableScale>
  );
}

export function SectionHeader({
  kicker,
  title,
  action,
  onAction,
}: {
  kicker?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={10} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.yellow} />
        </Pressable>
      )}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  badge,
  style,
  color = colors.white,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  badge?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
  accessibilityLabel?: string;
}) {
  return (
    <PressableScale onPress={onPress} style={[styles.iconButton, style]} scaleTo={0.9} accessibilityLabel={accessibilityLabel}>
      <Ionicons name={icon} size={20} color={color} />
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </PressableScale>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  compact,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  compact?: boolean;
}) {
  const size = compact ? 30 : 44;
  return (
    <View style={[styles.stepper, { height: size + 8 }]}>
      <PressableScale
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.stepBtn, { width: size, height: size }]}
        scaleTo={0.85}
      >
        <Ionicons name={value <= 1 && min === 0 ? 'trash-outline' : 'remove'} size={compact ? 14 : 18} color={colors.white} />
      </PressableScale>
      <Text style={[styles.stepValue, compact && { fontSize: 14, minWidth: 24 }]}>{value}</Text>
      <PressableScale
        onPress={() => onChange(value + 1)}
        style={[styles.stepBtn, { width: size, height: size }]}
        scaleTo={0.85}
      >
        <Ionicons name="add" size={compact ? 14 : 18} color={colors.white} />
      </PressableScale>
    </View>
  );
}

export function PulseDot({ color = colors.yellow }: { color?: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    const loop = () => {
      v.value = 0;
      v.value = withTiming(1, { duration: 1400 });
    };
    loop();
    const id = setInterval(loop, 1400);
    return () => clearInterval(id);
  }, []);
  const ring = useAnimatedStyle(() => ({
    opacity: 1 - v.value,
    transform: [{ scale: 1 + v.value * 1.8 }],
  }));
  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.dot, { backgroundColor: color, position: 'absolute' }, ring]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.black,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  kicker: {
    fontFamily: fonts.bold,
    color: colors.yellow,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 30,
    letterSpacing: 0.5,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 6 },
  sectionActionText: {
    fontFamily: fonts.bold,
    color: colors.yellow,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
  badgeText: { fontFamily: fonts.black, fontSize: 9, color: colors.black },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stepValue: {
    fontFamily: fonts.black,
    color: colors.white,
    fontSize: 17,
    minWidth: 34,
    textAlign: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
