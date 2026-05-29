import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { TodayDose } from '../types';

interface Props {
  dose: TodayDose;
  onGive: () => Promise<void>;
  onUndo: () => Promise<void>;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isOverdue(reminderTime: string | undefined) {
  if (!reminderTime) return false;
  const [hour, minute] = reminderTime.split(':').map(Number);
  const now = new Date();
  const reminder = new Date();
  reminder.setHours(hour, minute, 0, 0);
  return now > reminder;
}

function formatReminderTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MedicationDoseCard({ dose, onGive, onUndo }: Props) {
  const [saving, setSaving] = React.useState(false);
  const { medication, doseNumber, log } = dose;
  const reminderTime = medication.reminder_times[doseNumber - 1];
  const isGiven = log?.given_at != null;
  const overdue = !isGiven && isOverdue(reminderTime);

  async function handleGive() {
    setSaving(true);
    await onGive();
    setSaving(false);
  }

  async function handleUndo() {
    setSaving(true);
    await onUndo();
    setSaving(false);
  }

  return (
    <View
      style={[
        styles.card,
        isGiven && styles.cardGiven,
        overdue && styles.cardOverdue,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.petName}>{medication.pet_name ?? '—'}</Text>
          <Text style={styles.medName}>{medication.name}</Text>
          {medication.dosage ? (
            <Text style={styles.dosage}>{medication.dosage}</Text>
          ) : null}
        </View>
        {medication.frequency > 1 && (
          <View
            style={[styles.doseBadge, isGiven && styles.doseBadgeGiven]}
          >
            <Text
              style={[
                styles.doseBadgeText,
                isGiven && styles.doseBadgeTextGiven,
              ]}
            >
              Dose {doseNumber}
            </Text>
          </View>
        )}
      </View>

      {isGiven ? (
        <View style={styles.givenRow}>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.colors.success}
          />
          <Text style={styles.givenText}>
            Given by {log.given_by} at {formatTime(log.given_at!)}
          </Text>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={saving}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          {reminderTime && (
            <View style={styles.timeRow}>
              <Ionicons
                name="time-outline"
                size={13}
                color={
                  overdue ? theme.colors.danger : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.reminderText,
                  overdue && styles.reminderTextOverdue,
                ]}
              >
                {overdue ? 'Overdue · ' : ''}
                {formatReminderTime(reminderTime)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.giveButton,
              overdue && styles.giveButtonOverdue,
              saving && styles.giveButtonDisabled,
            ]}
            onPress={handleGive}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.giveButtonText}>Give dose</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardGiven: {
    borderColor: theme.colors.successBorder,
    backgroundColor: theme.colors.successLight,
  },
  cardOverdue: {
    borderColor: '#FCA5A5',
    backgroundColor: theme.colors.dangerLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  petName: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  medName: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dosage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  doseBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    marginTop: 2,
  },
  doseBadgeGiven: {
    backgroundColor: '#D1FAE5',
  },
  doseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  doseBadgeTextGiven: {
    color: theme.colors.success,
  },
  givenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  givenText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '500',
  },
  undoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  actionRow: {
    gap: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  reminderTextOverdue: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
  giveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giveButtonOverdue: {
    backgroundColor: theme.colors.danger,
  },
  giveButtonDisabled: {
    opacity: 0.7,
  },
  giveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
