import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import type { Medication } from '../types';

type FormValues = {
  pet_name: string;
  name: string;
  dosage: string;
  frequency: number;
  reminder_times: string[];
  active: boolean;
};

interface Props {
  initial?: Partial<Medication>;
  onSubmit: (values: FormValues) => Promise<void>;
  submitLabel: string;
}

function defaultTimes(frequency: number, existing: string[]): string[] {
  const defaults = ['08:00', '13:00', '18:00', '21:00'];
  return Array.from({ length: frequency }, (_, i) => existing[i] ?? defaults[i]);
}

function isValidTime(t: string) {
  return /^\d{2}:\d{2}$/.test(t) && (() => {
    const [h, m] = t.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  })();
}

export function MedicationForm({ initial, onSubmit, submitLabel }: Props) {
  const [petName, setPetName] = useState(initial?.pet_name ?? 'Penny');
  const [name, setName] = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [frequency, setFrequency] = useState(initial?.frequency ?? 1);
  const [reminderTimes, setReminderTimes] = useState<string[]>(
    defaultTimes(initial?.frequency ?? 1, initial?.reminder_times ?? []),
  );
  const [saving, setSaving] = useState(false);

  function changeFrequency(f: number) {
    setFrequency(f);
    setReminderTimes(defaultTimes(f, reminderTimes));
  }

  function updateReminderTime(index: number, value: string) {
    setReminderTimes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit() {
    if (!petName.trim()) {
      Alert.alert('Missing field', 'Please enter a pet name.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing field', 'Please enter a medication name.');
      return;
    }
    for (let i = 0; i < frequency; i++) {
      if (reminderTimes[i] && !isValidTime(reminderTimes[i])) {
        Alert.alert(
          'Invalid time',
          `Dose ${i + 1} reminder must be in HH:MM format (e.g. 08:00).`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      await onSubmit({
        pet_name: petName.trim(),
        name: name.trim(),
        dosage: dosage.trim() || null!,
        frequency,
        reminder_times: reminderTimes.slice(0, frequency).filter(Boolean),
        active: initial?.active ?? true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Pet name">
        <TextInput
          style={styles.input}
          value={petName}
          onChangeText={setPetName}
          placeholder="e.g. Penny"
          placeholderTextColor={theme.colors.textLight}
          autoCapitalize="words"
        />
      </Field>

      <Field label="Medication name">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Senvelgo"
          placeholderTextColor={theme.colors.textLight}
          autoCapitalize="words"
        />
      </Field>

      <Field label="Dosage (optional)">
        <TextInput
          style={styles.input}
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 2.5ml, 1 tablet"
          placeholderTextColor={theme.colors.textLight}
        />
      </Field>

      <Field label="Doses per day">
        <View style={styles.frequencyRow}>
          {[1, 2, 3, 4].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.freqButton,
                frequency === f && styles.freqButtonActive,
              ]}
              onPress={() => changeFrequency(f)}
            >
              <Text
                style={[
                  styles.freqButtonText,
                  frequency === f && styles.freqButtonTextActive,
                ]}
              >
                {f}×
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label={frequency === 1 ? 'Reminder time' : 'Reminder times'}>
        {Array.from({ length: frequency }, (_, i) => (
          <View key={i} style={styles.reminderRow}>
            {frequency > 1 && (
              <Text style={styles.reminderLabel}>Dose {i + 1}</Text>
            )}
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={reminderTimes[i] ?? ''}
              onChangeText={(v) => updateReminderTime(i, v)}
              placeholder="08:00"
              placeholderTextColor={theme.colors.textLight}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        ))}
        <Text style={styles.timeHint}>24-hour format (HH:MM)</Text>
      </Field>

      <TouchableOpacity
        style={[styles.submitButton, saving && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={styles.submitButtonText}>
          {saving ? 'Saving…' : submitLabel}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 48,
  },
  field: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  freqButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  freqButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  freqButtonTextActive: {
    color: theme.colors.primary,
  },
  reminderRow: {
    marginBottom: 8,
  },
  reminderLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeInput: {
    fontVariant: ['tabular-nums'],
  },
  timeHint: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
