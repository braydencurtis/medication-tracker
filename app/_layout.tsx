import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider, useUser } from '../context/UserContext';
import { configureNotificationHandler, requestPermissions } from '../lib/notifications';

configureNotificationHandler();

function RootLayoutNav() {
  const { name, loaded } = useUser();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loaded) return;
    const inSetup = segments[0] === 'setup';
    if (!name && !inSetup) {
      router.replace('/setup');
    } else if (name && inSetup) {
      router.replace('/(tabs)');
    }
  }, [name, loaded, segments]);

  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" />
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
    <UserProvider>
      <RootLayoutNav />
    </UserProvider>
  );
}
