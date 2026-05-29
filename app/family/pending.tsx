import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../constants/theme';

export default function PendingScreen() {
  const { user, refreshFamily, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to own family_members row — fires when owner approves
    const channel = supabase
      .channel(`pending-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'family_members',
        },
        async (payload) => {
          if (
            payload.new.user_id === user.id &&
            payload.new.status === 'approved'
          ) {
            await refreshFamily();
            router.replace('/(tabs)');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  function confirmLeave() {
    Alert.alert(
      'Cancel request',
      'This will remove your join request. You can rejoin later with the same code.',
      [
        { text: 'Keep waiting', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⏳</Text>
        <Text style={styles.title}>Waiting for approval</Text>
        <Text style={styles.subtitle}>
          The family owner needs to approve your request. This screen will
          update automatically once you're let in.
        </Text>
        <ActivityIndicator
          color={theme.colors.primary}
          style={styles.spinner}
        />
        <TouchableOpacity onPress={confirmLeave} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: theme.spacing.md },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  spinner: { marginBottom: theme.spacing.xl },
  cancelButton: { padding: theme.spacing.sm },
  cancelText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
