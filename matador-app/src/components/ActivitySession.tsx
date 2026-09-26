import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { WORKOUT_TYPES, type Workout } from '@/context/fitness';
import { haptic } from '@/utils/haptics';

function timeOfDay(t: number) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ActivitySession({
  workout,
  onRemove,
  compact = false,
}: {
  workout: Workout;
  onRemove: () => void;
  compact?: boolean;
}) {
  const kind = WORKOUT_TYPES.find((item) => item.key === workout.type)!;
  return (
    <View style={[styles.recent, compact && styles.recentCompact]}>
      <View style={[styles.recentIcon, compact && styles.recentIconCompact]}>
        <Ionicons name={kind.icon as keyof typeof Ionicons.glyphMap} size={compact ? 14 : 16} color={colors.yellow} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recentName}>{kind.label}</Text>
        <Text style={styles.recentMeta}>
          {new Date(workout.at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {'\u00B7'}{' '}
          {timeOfDay(workout.at)}
        </Text>
      </View>
      <Text style={styles.recentMin}>{workout.minutes} MIN</Text>
      <Pressable
        onPress={() => {
          haptic.select();
          onRemove();
        }}
        hitSlop={10}
        accessibilityLabel="Delete workout"
      >
        <Ionicons name="close" size={16} color={colors.mutedDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  recentCompact: { gap: 10, paddingVertical: 8, paddingHorizontal: 10 },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(254,219,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentIconCompact: { width: 28, height: 28, borderRadius: 14 },
  recentName: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  recentMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 1 },
  recentMin: { fontFamily: fonts.black, color: colors.white, fontSize: 12, letterSpacing: 1 },
});
