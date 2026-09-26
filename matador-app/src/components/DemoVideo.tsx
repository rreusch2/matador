import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radius } from '@/constants/theme';

/** Pulls an 11-character id out of youtu.be and youtube.com links. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export function videoHeight(width: number) {
  return Math.min(Math.round(((width - 40) * 9) / 16), 210);
}

export function DemoVideo({
  url,
  width,
  playing,
}: {
  url?: string | null;
  width: number;
  playing: boolean;
}) {
  const id = youtubeId(url);
  if (!id || !playing) return null;

  const w = width - 40;
  const h = videoHeight(width);
  const src =
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&playsinline=1&fs=0`;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.frame, { width: w, height: h }]}>
        {createElement('iframe', {
          src,
          width: '100%',
          height: '100%',
          style: { border: 0, width: '100%', height: '100%' },
          allow: 'autoplay; encrypted-media; picture-in-picture',
        })}
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width: w, height: h }]} pointerEvents="none">
      <WebView
        source={{ uri: src }}
        style={{ width: w, height: h, backgroundColor: colors.black }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
