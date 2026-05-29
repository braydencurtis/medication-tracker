import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { configureNotificationHandler, requestPermissions } from '../lib/notifications';

configureNotificationHandler();

function RootLayoutNav() {
  const { session, familyId, loaded } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loaded) return;

    const inAuth = segments[0] === '(auth)';
    const inFamilySetup = segments[0] === 'family';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
    } else if (!familyId) {
      if (!inFamilySetup) router.replace('/family/setup');
    } else {
      if (inAuth || inFamilySetup) router.replace('/(tabs)');
    }
  }, [session, familyId, loaded, segments]);

  useEffect(() => {
    requestPermissions();
  }, []);

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
