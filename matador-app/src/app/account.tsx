import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { PressableScale } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useFitness } from '@/context/fitness';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/utils/haptics';

type Profile = { first_name: string | null; marketing_opt_in: boolean; created_at: string };

const enter = (i: number) => FadeInDown.delay(60 + i * 50).duration(420).easing(Easing.out(Easing.cubic));

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, deleteAccount } = useAuth();
  const { workouts, streak } = useFitness();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('first_name, marketing_opt_in, created_at')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => data && setProfile(data as Profile));
  }, [user?.id]);

  const firstName = profile?.first_name ?? (user?.user_metadata?.first_name as string | undefined) ?? '';
  const since = new Date(profile?.created_at ?? user?.created_at ?? Date.now());
  const sinceLabel = since.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

  const toggleMarketing = async (next: boolean) => {
    if (!user || !profile) return;
    haptic.select();
    setProfile({ ...profile, marketing_opt_in: next });
    const { error: err } = await supabase.from('profiles').update({ marketing_opt_in: next }).eq('id', user.id);
    if (err) setProfile({ ...profile, marketing_opt_in: !next });
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      haptic.medium();
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const err = await deleteAccount();
    if (err) {
      setError(err);
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(firstName || user?.email || 'M').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>MEMBER SINCE {sinceLabel}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {firstName ? firstName.toUpperCase() : 'MATADOR'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={enter(0)} style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{workouts.length}</Text>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>
          <View style={[styles.stat, styles.statDivider]}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.card}>
          <Row icon="receipt-outline" label="Order history" value="Coming soon" />
          <Row icon="location-outline" label="Shipping addresses" value="Coming soon" divider />
          <View style={[styles.row, styles.rowDivider]}>
            <Ionicons name="megaphone-outline" size={20} color={colors.white} />
            <Text style={styles.rowLabel}>Drops & deals emails</Text>
            <Switch
              value={profile?.marketing_opt_in ?? false}
              onValueChange={toggleMarketing}
              disabled={!profile}
              trackColor={{ false: colors.borderBright, true: colors.yellow }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.borderBright}
            />
          </View>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <PressableScale
            onPress={() => {
              haptic.medium();
              signOut();
            }}
            style={styles.signOut}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.white} />
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </PressableScale>

          <Pressable onPress={onDelete} disabled={deleting} style={styles.delete} hitSlop={8}>
            {deleting ? (
              <ActivityIndicator color={colors.red} />
            ) : (
              <Text style={styles.deleteText}>
                {confirmDelete ? 'TAP AGAIN TO PERMANENTLY DELETE' : 'DELETE ACCOUNT'}
              </Text>
            )}
          </Pressable>
          {confirmDelete && !deleting && (
            <Text style={styles.deleteHint}>This removes your account and all of its data. It can't be undone.</Text>
          )}
          {error && <Text style={[styles.deleteHint, { color: colors.red }]}>{error}</Text>}
        </Animated.View>

        <View style={styles.footer}>
          <Logo width={44} style={{ opacity: 0.25 }} />
        </View>
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} scaleTo={0.9} accessibilityLabel="Close">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </PressableScale>
        <Text style={styles.topTitle}>ACCOUNT</Text>
        <View style={{ width: 42 }} />
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <Ionicons name={icon} size={20} color={colors.white} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
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
    paddingHorizontal: 20,
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, color: colors.black, fontSize: 34 },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 10, letterSpacing: 2.5 },
  name: { fontFamily: fonts.display, color: colors.white, fontSize: 34, lineHeight: 40, marginTop: 2 },
  email: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  stats: {
    flexDirection: 'row',
    marginTop: 28,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontFamily: fonts.display, color: colors.white, fontSize: 28 },
  statLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  card: {
    marginTop: 28,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, minHeight: 60 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, fontFamily: fonts.semibold, color: colors.white, fontSize: 15 },
  rowValue: { fontFamily: fonts.bold, color: colors.mutedDark, fontSize: 11, letterSpacing: 1 },
  signOut: {
    marginTop: 28,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderBright,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  signOutText: { fontFamily: fonts.black, color: colors.white, fontSize: 14, letterSpacing: 1.5 },
  delete: { alignSelf: 'center', marginTop: 22, minHeight: 20, justifyContent: 'center' },
  deleteText: { fontFamily: fonts.bold, color: colors.red, fontSize: 12, letterSpacing: 1.5 },
  deleteHint: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
  },
  footer: { alignItems: 'center', marginTop: 50 },
});
