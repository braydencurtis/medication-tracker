import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMedications } from '../../hooks/useMedications';
import { useAuth } from '../../context/AuthContext';
import { cancelAllForMedication } from '../../lib/notifications';
import { theme } from '../../constants/theme';
import type { Medication } from '../../types';

function formatFrequency(f: number) {
  return f === 1 ? 'Once daily' : `${f}× daily`;
}

function formatReminderTimes(times: string[]) {
  if (times.length === 0) return 'No reminders';
  return times
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    })
    .join(', ');
}

export default function MedicationsScreen() {
  const { familyId } = useAuth();
  const { medications, loading, deleteMedication, toggleActive } =
    useMedications(familyId);
  const router = useRouter();

  function confirmDelete(med: Medication) {
    Alert.alert(
      `Delete ${med.name}?`,
      `This will remove ${med.name} and all its dose history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelAllForMedication(med.id);
            await deleteMedication(med.id);
          },
        },
      ],
    );
  }

  function renderItem({ item }: { item: Medication }) {
    return (
      <View style={[styles.card, !item.active && styles.cardInactive]}>
        <View style={styles.cardMain}>
          <View style={styles.cardText}>
            <Text style={[styles.petName, !item.active && styles.textFaded]}>
              {item.pet_name ?? '—'}
            </Text>
            <Text style={[styles.medName, !item.active && styles.textFaded]}>
              {item.name}
            </Text>
            <Text style={[styles.meta, !item.active && styles.textFaded]}>
              {item.dosage ? `${item.dosage} · ` : ''}
              {formatFrequency(item.frequency)}
            </Text>
            <Text style={[styles.reminders, !item.active && styles.textFaded]}>
              <Ionicons name="notifications-outline" size={12} />{' '}
              {formatReminderTimes(item.reminder_times)}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Switch
              value={item.active}
              onValueChange={(val) => { toggleActive(item.id, val); }}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primaryLight,
              }}
              thumbColor={item.active ? theme.colors.primary : '#ccc'}
            />
          </View>
        </View>
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => router.push(`/medication/${item.id}`)}
          >
            <Ionicons
              name="pencil-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.footerButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => confirmDelete(item)}
          >
            <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
            <Text style={[styles.footerButtonText, { color: theme.colors.danger }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Medications</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💉</Text>
              <Text style={styles.emptyTitle}>No medications</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add one.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/medication/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardMain: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    alignItems: 'flex-start',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  petName: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  medName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  reminders: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  textFaded: {
    color: theme.colors.textLight,
  },
  cardActions: {
    paddingLeft: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  footerButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
