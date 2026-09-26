import { Image, type ImageRef, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { LOGO_ASPECT, logos } from '@/constants/theme';

export type LogoColor = keyof typeof logos;

const decoded: Partial<Record<LogoColor, ImageRef>> = {};

/** Decodes every logo up front so <Logo /> can paint on its very first frame. */
export function preloadLogos() {
  return Promise.all(
    (Object.keys(logos) as LogoColor[]).map(async (color) => {
      try {
        decoded[color] = await Image.loadAsync(logos[color]);
      } catch {}
    })
  );
}

export function Logo({
  width,
  color = 'white',
  style,
}: {
  width: number;
  color?: LogoColor;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={decoded[color] ?? logos[color]}
      style={[{ width, height: width / LOGO_ASPECT }, style]}
      contentFit="contain"
      transition={0}
      cachePolicy="memory"
    />
  );
}
