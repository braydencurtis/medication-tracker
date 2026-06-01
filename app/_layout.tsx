import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import {
  configureNotificationHandler,
  requestPermissions,
  registerPushToken,
} from '../lib/notifications';

configureNotificationHandler();

function RootLayoutNav() {
  const { session, familyId, memberStatus, loaded } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loaded) return;

    const inAuth        = segments[0] === '(auth)';
    const inFamily      = segments[0] === 'family';
    const isPendingScreen   = inFamily && segments[1] === 'pending';
    const isSetupScreen     = inFamily && segments[1] === 'setup';
    const isResetPassword   = segments[0] === 'reset-password';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
    } else if (isResetPassword) {
      // Stay on the reset-password screen while the user sets a new password
    } else if (memberStatus === 'pending') {
      if (!isPendingScreen) router.replace('/family/pending');
    } else if (!familyId) {
      if (!isSetupScreen) router.replace('/family/setup');
    } else {
      if (inAuth || inFamily) router.replace('/(tabs)');
    }
  }, [session, familyId, memberStatus, loaded, segments]);

  useEffect(() => {
    if (!userId || !familyId) return;
    requestPermissions().then((granted) => {
      if (granted) registerPushToken(userId).catch(console.error);
    });
  }, [userId, familyId]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="family" />
        <Stack.Screen
          name="medication/new"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Add medication',
            headerTintColor: '#7B4F9E',
          }}
        />
        <Stack.Screen
          name="medication/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Edit medication',
            headerTintColor: '#7B4F9E',
          }}
        />
        <Stack.Screen
          name="pet/new"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Add pet',
            headerTintColor: '#7B4F9E',
          }}
        />
        <Stack.Screen
          name="pet/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Edit pet',
            headerTintColor: '#7B4F9E',
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
