import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { colors, radius } from '@/constants/theme';

export type ExerciseVideoProps = {
  videoId: string;
  width: number;
  height: number;
  play: boolean;
  onError: () => void;
};

// Identifies this app to YouTube. An embed with no referrer is rejected (error 153).
const ORIGIN = 'https://com.matador.app';

/**
 * YouTube only autoplays when the clip is muted first, and its own play button,
 * title bar and logo cannot be turned off. This page mutes, starts, and loops
 * the clip itself, and crops the frame so that chrome sits outside the window.
 */
function playerHtml(videoId: string) {
  const id = videoId.replace(/[^A-Za-z0-9_-]/g, '');
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>
      html, body { margin: 0; height: 100%; background: #0B0B0B; overflow: hidden; }
      #stage { position: absolute; top: 0; right: 0; bottom: 0; left: 0; overflow: hidden; }
      #shield { position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: 2; }
    </style>
  </head>
  <body>
    <div id="stage"><div id="player"></div></div>
    <div id="shield"></div>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
      var player;
      var wantPlay = true;

      function post(msg) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }

      function silence() {
        if (!player || !player.mute) return;
        player.mute();
        player.setVolume(0);
      }

      function kick() {
        if (!player || !player.playVideo || !wantPlay) return;
        var state = player.getPlayerState ? player.getPlayerState() : -1;
        if (state !== 1 && state !== 3) player.playVideo();
      }

      function crop() {
        if (!player || !player.getIframe) return;
        var frame = player.getIframe();
        if (!frame) return;
        frame.style.cssText = 'position:absolute;top:-30%;left:-4%;width:108%;height:160%;border:0;pointer-events:none;';
      }

      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          width: '480',
          height: '270',
          videoId: '${id}',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            loop: 1,
            playlist: '${id}',
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            origin: '${ORIGIN}'
          },
          events: {
            onReady: function (event) {
              crop();
              if (wantPlay) event.target.playVideo();
              silence();
              post({ type: 'ready' });
            },
            onStateChange: function (event) {
              if (event.data === 0 && wantPlay) {
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
              silence();
              post({ type: 'state', data: event.data });
            },
            onError: function (event) {
              post({ type: 'error', data: event.data });
            }
          }
        });
      }

      setInterval(function () {
        if (!player || !player.getDuration) return;
        silence();
        var duration = player.getDuration();
        var time = player.getCurrentTime();
        if (wantPlay && duration > 2 && time > 0.5 && duration - time < 0.35) {
          player.seekTo(0, true);
          player.playVideo();
        }
        kick();
        silence();
        crop();
      }, 400);

      function onMsg(event) {
        var msg;
        try { msg = JSON.parse(event.data); } catch (e) { return; }
        if (!msg || !msg.func) return;
        if (msg.func === 'pause') wantPlay = false;
        if (msg.func === 'play') wantPlay = true;
        if (!player || !player.playVideo) return;
        if (wantPlay) player.playVideo();
        else player.pauseVideo();
        silence();
      }
      window.addEventListener('message', onMsg);
      document.addEventListener('message', onMsg);
    </script>
  </body>
</html>`;
}

/** How long YouTube leaves its title bar up after playback starts. */
const CHROME_MS = 3000;

/** Muted, looping demo with none of YouTube's controls visible. */
export function ExerciseVideo({ videoId, width, height, play, onError }: ExerciseVideoProps) {
  const web = useRef<WebView>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [live, setLive] = useState(false);

  const source = useMemo(() => ({ html: playerHtml(videoId), baseUrl: ORIGIN }), [videoId]);

  const reveal = useCallback(() => {
    if (shown.current) return;
    shown.current = true;
    setLive(true);
    Animated.timing(fade, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const scheduleReveal = useCallback(() => {
    if (shown.current || hold.current) return;
    hold.current = setTimeout(() => {
      hold.current = null;
      reveal();
    }, CHROME_MS);
  }, [reveal]);

  useEffect(() => {
    shown.current = false;
    setLive(false);
    fade.setValue(0);
    if (hold.current) {
      clearTimeout(hold.current);
      hold.current = null;
    }
    const slow = setTimeout(reveal, 9000);
    return () => {
      clearTimeout(slow);
      if (hold.current) {
        clearTimeout(hold.current);
        hold.current = null;
      }
    };
  }, [videoId, fade, reveal]);

  useEffect(() => {
    web.current?.postMessage(JSON.stringify({ func: play ? 'play' : 'pause' }));
  }, [play, videoId, live]);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { type?: string } = {};
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'error') onError();
    if (msg.type === 'state' && (msg as { data?: number }).data === 1) scheduleReveal();
  };

  return (
    <View style={[styles.frame, { width, height }]} pointerEvents="none">
      <Animated.View style={[styles.clip, { opacity: fade }]}>
        <WebView
          ref={web}
          source={source}
          style={styles.web}
          pointerEvents="none"
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          allowsFullscreenVideo={false}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          scalesPageToFit={false}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          onMessage={onMessage}
          onError={onError}
        />
      </Animated.View>
      {!live && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.yellow} />
        </View>
      )}
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
  clip: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent', opacity: 0.99 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
