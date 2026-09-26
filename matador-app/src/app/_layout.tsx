import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { preloadLogos } from '@/components/Logo';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { CartProvider } from '@/context/cart';
import { FitnessProvider } from '@/context/fitness';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(colors.black).catch(() => {});

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <FitnessProvider>
          <StatusBar style="light" />
          <AppShell />
        </FitnessProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [logosReady, setLogosReady] = useState(false);
  const { session, loading: authLoading } = useAuth();
  const signedIn = !!session;

  useEffect(() => {
    preloadLogos().finally(() => setLogosReady(true));
  }, []);

  return (
    <AnimatedSplash
      ready={(fontsLoaded || !!fontError) && logosReady && !authLoading}
      target={signedIn ? 'header' : 'auth'}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.black },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="timer" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="workout-plan" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="workout-history" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="activity" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="program" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="goals" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="exercises/index" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="exercises/[slug]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="account" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </AnimatedSplash>
  );
}
