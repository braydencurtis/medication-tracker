import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTodayDoses } from '../../hooks/useTodayDoses';
import { usePets } from '../../hooks/usePets';
import { MedicationDoseCard } from '../../components/MedicationDoseCard';
import {
  scheduleReminders,
  cancelDoseNotification,
  sendDoseGivenNotification,
} from '../../lib/notifications';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../constants/theme';
import type { TodayDose } from '../../types';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formattedDate() {
  return new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayScreen() {
  const {
    todayDoses,
    medications,
    doseLogs,
    loading,
    error,
    markDoseGiven,
    undoDose,
    refetch,
  } = useTodayDoses();
  const { displayName: name, familyId, user } = useAuth();
  const { pets } = usePets(familyId);

  useFocusEffect(
    useCallback(() => {
      if (medications.length > 0) {
        scheduleReminders(medications, doseLogs).catch(console.error);
      }
    }, [medications, doseLogs]),
  );

  const givenCount = todayDoses.filter((d) => d.log?.given_at).length;
  const totalCount = todayDoses.length;
  const allDone = totalCount > 0 && givenCount === totalCount;

  async function handleGive(medicationId: string, doseNumber: number) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { error } = await markDoseGiven(
      medicationId,
      doseNumber,
      name ?? 'Someone',
    );
    if (error) {
      Alert.alert('Error', 'Could not save dose. Please try again.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    cancelDoseNotification(medicationId, doseNumber, today).catch(console.error);

    // Notify other family members via Expo Push API
    if (user) {
      const dose = todayDoses.find(
        (d) => d.medication.id === medicationId && d.doseNumber === doseNumber,
      );
      if (dose) {
        const pet = pets.find((p) => p.id === dose.medication.pet_id);
        sendDoseGivenNotification({
          currentUserId: user.id,
          petName: pet?.name ?? dose.medication.pet_name ?? 'Pet',
          medName: dose.medication.name,
          givenBy: name ?? 'Someone',
        }).catch(console.error);
      }
    }
  }

  async function handleUndo(medicationId: string, doseNumber: number) {
    const { error } = await undoDose(medicationId, doseNumber);
    if (error) Alert.alert('Error', 'Could not undo. Please try again.');
  }

  function renderItem({ item }: { item: TodayDose }) {
    const pet = pets.find((p) => p.id === item.medication.pet_id) ?? null;
    return (
      <MedicationDoseCard
        dose={item}
        pet={pet}
        onGive={() => handleGive(item.medication.id, item.doseNumber)}
        onUndo={() => handleUndo(item.medication.id, item.doseNumber)}
      />
    );
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.greeting}>{greeting()}</Text>
      <Text style={styles.date}>{formattedDate()}</Text>
      {totalCount > 0 && (
        <View style={[styles.statusPill, allDone && styles.statusPillDone]}>
          <Text style={[styles.statusText, allDone && styles.statusTextDone]}>
            {allDone
              ? '✓ All done for today!'
              : `${givenCount} of ${totalCount} dose${totalCount !== 1 ? 's' : ''} given`}
          </Text>
        </View>
      )}
    </View>
  );

  const empty = loading ? null : (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>💊</Text>
      <Text style={styles.emptyTitle}>No medications yet</Text>
      <Text style={styles.emptySubtitle}>
        Add medications in the Medications tab to get started.
      </Text>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            Check your .env Supabase credentials.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={todayDoses}
        keyExtractor={(item) => `${item.medication.id}-${item.doseNumber}`}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: 32,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  date: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusPillDone: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  statusTextDone: {
    color: theme.colors.success,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
