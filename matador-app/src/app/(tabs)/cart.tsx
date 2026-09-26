import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductArt } from '@/components/ProductArt';
import { Button, PressableScale, Reveal, Stepper } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { TAB_BAR_HEIGHT, colors, fonts, radius } from '@/constants/theme';
import { useCart } from '@/context/cart';
import { formatPrice } from '@/data/products';
import { haptic } from '@/utils/haptics';

const FREE_SHIPPING = 50;
const PROMO_CODES: Record<string, number> = { CHARGE10: 0.1, MATADOR20: 0.2 };

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, setQty, remove, clear, count } = useCart();
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<string | null>(null);
  const shipProgress = Math.min(subtotal / FREE_SHIPPING, 1);
  const progress = useSharedValue(shipProgress);

  useEffect(() => {
    progress.value = withTiming(shipProgress, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [shipProgress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const discount = applied ? subtotal * PROMO_CODES[applied] : 0;
  const shipping = subtotal >= FREE_SHIPPING || subtotal === 0 ? 0 : 5.99;
  const total = subtotal - discount + shipping;
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    if (PROMO_CODES[c]) {
      setApplied(c);
      haptic.success();
    } else {
      haptic.heavy();
      notify('Invalid code', 'Try CHARGE10 for 10% off.');
    }
  };

  const checkout = () => {
    haptic.success();
    notify('Checkout coming soon', 'Hook this up to Shopify or Stripe to take real payments.');
  };

  if (items.length === 0) {
    return (
      <View style={[styles.screen, styles.emptyWrap, { paddingTop: insets.top }]}>
        <Reveal style={{ alignItems: 'center' }}>
          <View style={styles.emptyIcon}>
            <Logo width={90} style={{ opacity: 0.18 }} />
          </View>
          <Text style={styles.emptyTitle}>YOUR CART IS EMPTY</Text>
          <Text style={styles.emptyText}>Time to fuel up. Grab some shots, sticks or fresh merch.</Text>
          <Button label="START SHOPPING" icon="arrow-forward" onPress={() => router.navigate('/shop')} style={{ marginTop: 26, alignSelf: 'stretch' }} />
        </Reveal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40 }}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>{count} {count === 1 ? 'ITEM' : 'ITEMS'}</Text>
            <Text style={styles.title}>YOUR CART</Text>
          </View>
          <Pressable
            onPress={() => {
              haptic.medium();
              clear();
              setApplied(null);
            }}
            hitSlop={10}
          >
            <Text style={styles.clear}>CLEAR</Text>
          </Pressable>
        </View>

        <View style={styles.shipping}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={remaining ? 'rocket-outline' : 'checkmark-circle'} size={16} color={colors.yellow} />
            <Text style={styles.shippingText}>
              {remaining ? (
                <>
                  You're <Text style={{ color: colors.yellow }}>{formatPrice(remaining)}</Text> away from free shipping
                </>
              ) : (
                'You unlocked FREE shipping'
              )}
            </Text>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, barStyle]} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {items.map((item) => (
            <Animated.View
              key={item.key}
              entering={FadeIn}
              exiting={FadeOutLeft}
              layout={LinearTransition.springify().damping(18)}
              style={styles.item}
            >
              <Pressable
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.productId } })}
                style={[styles.itemArt, { backgroundColor: `${item.product.gradient[1]}26` }]}
              >
                <ProductArt product={item.product} size={84} glow={false} />
              </Pressable>
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {[item.variant, item.product.flavor].filter(Boolean).join(' \u00B7 ')}
                    </Text>
                  </View>
                  <Pressable onPress={() => remove(item.key)} hitSlop={10} accessibilityLabel="Remove">
                    <Ionicons name="close" size={18} color={colors.mutedDark} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.itemPrice}>{formatPrice(item.unitPrice * item.quantity)}</Text>
                  <Stepper compact min={0} value={item.quantity} onChange={(q) => setQty(item.key, q)} />
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.promo}>
          <Ionicons name="pricetag-outline" size={18} color={colors.muted} />
          <TextInput
            value={applied ?? code}
            editable={!applied}
            onChangeText={setCode}
            placeholder="Promo code"
            placeholderTextColor={colors.mutedDark}
            autoCapitalize="characters"
            style={styles.promoInput}
            onSubmitEditing={applyCode}
          />
          <PressableScale
            onPress={applied ? () => { setApplied(null); setCode(''); } : applyCode}
            style={[styles.promoBtn, applied && { backgroundColor: colors.surfaceHigh }]}
          >
            <Text style={[styles.promoBtnText, applied && { color: colors.white }]}>{applied ? 'REMOVE' : 'APPLY'}</Text>
          </PressableScale>
        </View>

        <View style={styles.summary}>
          <Row label="Subtotal" value={formatPrice(subtotal)} />
          {applied && <Row label={`Discount (${applied})`} value={`-${formatPrice(discount)}`} highlight />}
          <Row label="Shipping" value={shipping ? formatPrice(shipping) : 'FREE'} highlight={!shipping} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.total}>{formatPrice(total)}</Text>
          </View>
        </View>

        <Button label="CHECKOUT" icon="lock-closed" onPress={checkout} style={{ marginHorizontal: 20, marginTop: 20, height: 60 }} />
        <View style={styles.pay}>
          {(['logo-apple', 'logo-google', 'card-outline'] as const).map((i) => (
            <View key={i} style={styles.payChip}>
              <Ionicons name={i} size={16} color={colors.white} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.yellow }]}>{value}</Text>
    </View>
  );
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  emptyTitle: { fontFamily: fonts.display, color: colors.white, fontSize: 32, textAlign: 'center' },
  emptyText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  kicker: { fontFamily: fonts.bold, color: colors.yellow, fontSize: 11, letterSpacing: 3 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 48, lineHeight: 62, marginTop: 2 },
  clear: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12, letterSpacing: 1.5, paddingBottom: 12 },
  shipping: {
    marginHorizontal: 20,
    marginVertical: 18,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  shippingText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 13 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.yellow },
  item: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemArt: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemName: { fontFamily: fonts.bold, color: colors.white, fontSize: 15 },
  itemMeta: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  itemPrice: { fontFamily: fonts.display, color: colors.white, fontSize: 20 },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
    paddingLeft: 16,
    paddingRight: 6,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  promoInput: { flex: 1, color: colors.white, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1, height: '100%' },
  promoBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBtnText: { fontFamily: fonts.black, color: colors.black, fontSize: 12, letterSpacing: 1.2 },
  summary: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  rowValue: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: fonts.black, color: colors.white, fontSize: 14, letterSpacing: 2 },
  total: { fontFamily: fonts.display, color: colors.white, fontSize: 32 },
  pay: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  payChip: {
    width: 48,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
