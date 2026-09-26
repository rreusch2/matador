import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius } from '@/constants/theme';
import type { ExerciseVideoProps } from './ExerciseVideo';

export function ExerciseVideo({ videoId, width, height, play }: ExerciseVideoProps) {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const command = { event: 'command', func: play ? 'playVideo' : 'pauseVideo', args: [] };
    frame.current?.contentWindow?.postMessage(JSON.stringify(command), '*');
  }, [play]);

  // YouTube only loops a single clip when it is also passed as the playlist.
  const src =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&controls=0&iv_load_policy=3&enablejsapi=1`;

  return (
    <View style={[styles.frame, { width, height }]}>
      <iframe
        ref={frame}
        src={src}
        width={width}
        height={height}
        title="Exercise demo"
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{ border: 0, display: 'block' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#111111' },
});
