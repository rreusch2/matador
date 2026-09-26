import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Logo as BrandLogo } from '@/components/Logo';
import { colors, fonts } from '@/constants/theme';
import type { Product } from '@/data/products';

type Props = {
  product: Product;
  size: number;
  glow?: boolean;
  style?: ViewStyle;
};

/**
 * Code-drawn product renders so the app looks finished before real product photography exists.
 * Swap this for <Image source={product.image} /> once you have shots.
 */
export function ProductArt({ product, size, glow = true, style }: Props) {
  let art: React.ReactNode;
  if (product.category === 'energy') art = <Shot product={product} s={size} />;
  else if (product.category === 'hydration') art = <Sticks product={product} s={size} />;
  else if (product.merchKind === 'hat') art = <Cap s={size} />;
  else if (product.merchKind === 'shaker') art = <Shaker s={size} />;
  else art = <Tee product={product} s={size} />;

  const glowColor = product.category === 'merch' ? colors.yellow : product.gradient[1];

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {glow && (
        <View
          style={{
            position: 'absolute',
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: size,
            backgroundColor: glowColor,
            opacity: 0.22,
            boxShadow: `0 0 ${Math.round(size * 0.3)}px ${Math.round(size * 0.12)}px ${glowColor}`,
          }}
        />
      )}
      {art}
    </View>
  );
}

function Logo({ width, dark, yellow }: { width: number; dark?: boolean; yellow?: boolean }) {
  return <BrandLogo width={width} color={yellow ? 'yellow' : dark ? 'black' : 'white'} />;
}

function Shot({ product, s }: { product: Product; s: number }) {
  const ink = product.darkInk ? colors.black : colors.white;
  const bodyW = s * 0.34;
  const bodyH = s * 0.56;
  const accent = product.id === 'black-horn' ? colors.yellow : product.gradient[1];

  return (
    <View style={{ alignItems: 'center', transform: [{ rotate: '-10deg' }] }}>
      <LinearGradient
        colors={['#3A3A3A', '#0A0A0A', '#1E1E1E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: s * 0.2,
          height: s * 0.13,
          borderTopLeftRadius: s * 0.03,
          borderTopRightRadius: s * 0.03,
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          paddingVertical: s * 0.015,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ width: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        ))}
      </LinearGradient>
      <View style={{ width: s * 0.22, height: s * 0.022, backgroundColor: '#000' }} />
      <View
        style={{
          width: s * 0.2,
          height: s * 0.04,
          backgroundColor: product.gradient[0],
          borderTopLeftRadius: s * 0.01,
          borderTopRightRadius: s * 0.01,
        }}
      />
      <LinearGradient
        colors={product.gradient}
        style={{
          width: bodyW,
          height: bodyH,
          borderRadius: s * 0.06,
          borderTopLeftRadius: s * 0.1,
          borderTopRightRadius: s * 0.1,
          overflow: 'hidden',
          alignItems: 'center',
          paddingTop: bodyH * 0.13,
        }}
      >
        <Logo width={bodyW * 0.62} dark={product.darkInk} />
        <Text
          style={{
            fontFamily: fonts.display,
            color: ink,
            fontSize: s * 0.075,
            letterSpacing: s * 0.004,
            marginTop: bodyH * 0.06,
          }}
          numberOfLines={1}
        >
          MATADOR
        </Text>
        <Text
          style={{
            fontFamily: fonts.black,
            color: ink,
            opacity: 0.8,
            fontSize: Math.max(s * 0.024, 4),
            letterSpacing: s * 0.004,
          }}
          numberOfLines={1}
        >
          ENERGY SHOT
        </Text>
        <View
          style={{
            position: 'absolute',
            bottom: bodyH * 0.1,
            left: 0,
            right: 0,
            height: bodyH * 0.14,
            backgroundColor: product.darkInk ? colors.black : 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontFamily: fonts.display, color: accent, fontSize: s * 0.034, letterSpacing: 1 }}
            numberOfLines={1}
          >
            {product.name.toUpperCase()}
          </Text>
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.28)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            position: 'absolute',
            left: bodyW * 0.12,
            top: bodyH * 0.06,
            bottom: bodyH * 0.06,
            width: bodyW * 0.07,
            borderRadius: bodyW,
            backgroundColor: 'rgba(255,255,255,0.35)',
          }}
        />
      </LinearGradient>
    </View>
  );
}

function Packet({ product, s }: { product: Product; s: number }) {
  const w = s * 0.17;
  const h = s * 0.72;
  const ink = product.darkInk ? colors.black : colors.white;
  const crimp = (
    <View
      style={{
        height: h * 0.07,
        backgroundColor: 'rgba(0,0,0,0.14)',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ width: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      ))}
    </View>
  );

  return (
    <LinearGradient
      colors={product.gradient}
      style={{ width: w, height: h, borderRadius: s * 0.015, overflow: 'hidden', justifyContent: 'space-between' }}
    >
      {crimp}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: h * 0.05 }}>
          <Logo width={w * 0.7} dark={product.darkInk} />
        </View>
        <Text
          style={{
            position: 'absolute',
            width: h * 0.7,
            maxWidth: h * 0.7,
            textAlign: 'center',
            fontFamily: fonts.display,
            color: ink,
            fontSize: s * 0.075,
            letterSpacing: s * 0.006,
            transform: [{ rotate: '-90deg' }],
          }}
        >
          MATADOR
        </Text>
        <Text
          numberOfLines={1}
          style={{
            position: 'absolute',
            bottom: h * 0.04,
            fontFamily: fonts.black,
            color: ink,
            fontSize: Math.max(s * 0.022, 4),
            letterSpacing: 1,
          }}
        >
          HYDRATE
        </Text>
      </View>
      {crimp}
      <LinearGradient
        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </LinearGradient>
  );
}

function Sticks({ product, s }: { product: Product; s: number }) {
  const place = (rotate: number, x: number, y: number) => ({
    position: 'absolute' as const,
    transform: [{ translateX: x }, { translateY: y }, { rotate: `${rotate}deg` }],
  });
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={place(-18, -s * 0.19, s * 0.03)}>
        <Packet product={product} s={s} />
      </View>
      <View style={place(18, s * 0.19, s * 0.03)}>
        <Packet product={product} s={s} />
      </View>
      <View style={place(0, 0, -s * 0.02)}>
        <Packet product={product} s={s} />
      </View>
    </View>
  );
}

function Tee({ product, s }: { product: Product; s: number }) {
  const light = product.darkInk;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="tshirt-crew" size={s * 0.86} color={light ? colors.yellow : '#1C1C1C'} />
      <View style={StyleSheet.absoluteFill}>
        <MaterialCommunityIcons
          name="tshirt-crew-outline"
          size={s * 0.86}
          color={light ? 'rgba(0,0,0,0.12)' : '#3A3A3A'}
        />
      </View>
      <View style={{ position: 'absolute', top: s * 0.3 }}>
        <Logo width={s * 0.2} dark={light} yellow={!light} />
      </View>
    </View>
  );
}

function Cap({ s }: { s: number }) {
  const domeW = s * 0.58;
  const domeH = s * 0.32;
  return (
    <View style={{ alignItems: 'center', transform: [{ rotate: '-6deg' }] }}>
      <View
        style={{
          width: s * 0.045,
          height: s * 0.022,
          borderTopLeftRadius: s,
          borderTopRightRadius: s,
          backgroundColor: '#1E1E1E',
        }}
      />
      <LinearGradient
        colors={['#343434', '#0E0E0E']}
        style={{
          width: domeW,
          height: domeH,
          borderTopLeftRadius: domeW / 2,
          borderTopRightRadius: domeW / 2,
          borderBottomLeftRadius: s * 0.02,
          borderBottomRightRadius: s * 0.02,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: domeH * 0.15,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: domeW * 0.3,
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: domeW * 0.3,
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Logo width={domeW * 0.42} yellow />
      </LinearGradient>
      <View
        style={{
          width: s * 0.5,
          height: s * 0.08,
          marginTop: -s * 0.012,
          marginLeft: s * 0.26,
          borderRadius: s * 0.05,
          backgroundColor: '#111',
          borderWidth: 1,
          borderColor: '#2C2C2C',
          transform: [{ rotate: '5deg' }],
        }}
      />
    </View>
  );
}

function Shaker({ s }: { s: number }) {
  const bodyW = s * 0.34;
  return (
    <View style={{ alignItems: 'center', transform: [{ rotate: '8deg' }] }}>
      <View
        style={{
          width: s * 0.1,
          height: s * 0.05,
          marginLeft: s * 0.12,
          borderTopLeftRadius: s * 0.02,
          borderTopRightRadius: s * 0.02,
          backgroundColor: '#161616',
        }}
      />
      <View
        style={{
          width: bodyW * 1.06,
          height: s * 0.1,
          borderRadius: s * 0.025,
          backgroundColor: '#0D0D0D',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <View style={{ height: s * 0.014, backgroundColor: colors.yellow }} />
      </View>
      <LinearGradient
        colors={['#FFFFFF', '#D6D6D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: bodyW,
          height: s * 0.5,
          borderBottomLeftRadius: s * 0.05,
          borderBottomRightRadius: s * 0.05,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {[0.2, 0.35, 0.5, 0.65].map((t) => (
          <View
            key={t}
            style={{
              position: 'absolute',
              left: bodyW * 0.08,
              top: s * 0.5 * t,
              width: bodyW * 0.12,
              height: 1.5,
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}
          />
        ))}
        <Logo width={bodyW * 0.55} dark />
        <Text style={{ fontFamily: fonts.display, fontSize: s * 0.05, color: colors.black, marginTop: s * 0.02 }}>
          MATADOR
        </Text>
      </LinearGradient>
    </View>
  );
}
