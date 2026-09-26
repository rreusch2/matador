import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from 'react-native-youtube-iframe';

import { colors, radius } from '@/constants/theme';

export type ExerciseVideoProps = {
  videoId: string;
  width: number;
  height: number;
  play: boolean;
  onError: () => void;
};

/** Muted, looping exercise demo. Changing `videoId` swaps the clip in place. */
export function ExerciseVideo({ videoId, width, height, play, onError }: ExerciseVideoProps) {
  const player = useRef<YoutubeIframeRef>(null);
  const [ready, setReady] = useState(false);

  return (
    <View style={[styles.frame, { width, height }]}>
      <YoutubePlayer
        ref={player}
        videoId={videoId}
        width={width}
        height={height}
        play={play}
        mute
        forceAndroidAutoplay
        initialPlayerParams={{ controls: false, rel: false, iv_load_policy: 3, preventFullScreen: true }}
        onReady={() => setReady(true)}
        onChangeState={(state: PLAYER_STATES) => {
          if (state === PLAYER_STATES.ENDED) player.current?.seekTo(0, true);
        }}
        onError={onError}
        // Android crashes when a WebView at full opacity sits inside a navigator transition.
        webViewStyle={styles.webView}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          scrollEnabled: false,
        }}
      />
      {!ready && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.muted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#111111' },
  webView: { opacity: 0.99, backgroundColor: 'transparent' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
