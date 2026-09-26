import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius } from '@/constants/theme';
import type { ExerciseVideoProps } from './ExerciseVideo';

function send(frame: HTMLIFrameElement | null, func: string, args: number[] = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

/** Same demo on web: muted, looping, and cropped so the YouTube frame stays hidden. */
export function ExerciseVideo({ videoId, width, height, play }: ExerciseVideoProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const id = videoId.replace(/[^A-Za-z0-9_-]/g, '');

  useEffect(() => {
    const silence = () => {
      send(frame.current, 'mute');
      send(frame.current, 'setVolume', [0]);
    };
    silence();
    send(frame.current, play ? 'playVideo' : 'pauseVideo');
    const timer = setInterval(silence, 500);
    return () => clearInterval(timer);
  }, [play, videoId]);

  const src =
    `https://www.youtube-nocookie.com/embed/${id}` +
    '?autoplay=1&mute=1&loop=1&playlist=' +
    id +
    '&playsinline=1&controls=0&rel=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&enablejsapi=1';

  return (
    <View style={[styles.frame, { width, height }]} pointerEvents="none">
      <iframe
        ref={frame}
        src={src}
        title="Exercise demo"
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-4%',
          width: '108%',
          height: '160%',
          border: 0,
          pointerEvents: 'none',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
