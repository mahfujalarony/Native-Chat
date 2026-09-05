import { router, Slot, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { token, isLoading, checkAuth } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync().catch(() => {});

    const isAuthGroup = (segments as string[])[0] === '(auth)';

    if (!token && !isAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (token && isAuthGroup) {
      router.replace('/(main)' as any);
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

