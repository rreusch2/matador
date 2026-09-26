import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProductArt } from '@/components/ProductArt';
import { Button, PulseDot } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { getProduct } from '@/data/products';
import { haptic } from '@/utils/haptics';

function useCountdown(target: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now) / 1000;
  return {
    d: Math.floor(diff / 86400),
    h: Math.floor((diff % 86400) / 3600),
    m: Math.floor((diff % 3600) / 60),
    s: Math.floor(diff % 60),
  };
}

/** Upcoming merch drop teaser with a live countdown. */
export function DropCard({ target }: { target: number }) {
  const { d, h, m, s } = useCountdown(target);
  const [notify, setNotify] = useState(false);
  const tee = getProduct('gold-horns-tee')!;
  const cap = getProduct('charge-cap')!;

  return (
    <View style={styles.drop}>
      <LinearGradient
        colors={['rgba(254,219,0,0.16)', 'rgba(254,219,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PulseDot />
        <Text style={styles.dropKicker}>DROP 02 {'\u00B7'} INCOMING</Text>
      </View>
      <Text style={styles.dropTitle}>THE GOLD{'\n'}HORNS COLLECTION</Text>

      <View style={styles.dropArt}>
        <ProductArt product={cap} size={130} glow={false} />
        <ProductArt product={tee} size={150} style={{ marginLeft: -30 }} />
      </View>

      <View style={styles.countdown}>
        {[
          [d, 'DAYS'],
          [h, 'HRS'],
          [m, 'MIN'],
          [s, 'SEC'],
        ].map(([v, l]) => (
          <View key={l} style={styles.countBox}>
            <Text style={styles.countValue}>{String(v).padStart(2, '0')}</Text>
            <Text style={styles.countLabel}>{l}</Text>
          </View>
        ))}
      </View>

      <Button
        label={notify ? "YOU'RE ON THE LIST" : 'NOTIFY ME'}
        icon={notify ? 'checkmark-circle' : 'notifications-outline'}
        variant={notify ? 'light' : 'primary'}
        onPress={() => {
          setNotify((n) => !n);
          haptic.success();
        }}
        style={{ marginTop: 18 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(254,219,0,0.45)',
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  dropKicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  dropTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 36, lineHeight: 42, marginTop: 10 },
  dropArt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 6 },
  countdown: { flexDirection: 'row', gap: 10 },
  countBox: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  countValue: { fontFamily: fonts.display, color: colors.white, fontSize: 30 },
  countLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, letterSpacing: 2 },
});
