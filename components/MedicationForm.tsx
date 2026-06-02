import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { usePets } from '../hooks/usePets';
import { getPetPhotoUrl } from '../lib/storage';
import type { Medication, Pet } from '../types';

export type MedicationFormValues = {
  pet_id: string;
  pet_name: string;
  name: string;
  dosage: string | null;
  frequency: number;
  reminder_times: string[];
  active: boolean;
};

interface Props {
  familyId: string | null;
  initial?: Partial<Medication>;
  onSubmit: (values: MedicationFormValues) => Promise<void>;
  submitLabel: string;
}

function defaultTimes(frequency: number, existing: string[]): string[] {
  const defaults = ['08:00', '13:00', '18:00', '21:00'];
  return Array.from({ length: frequency }, (_, i) => existing[i] ?? defaults[i]);
}

/** Parse "HH:MM" → Date (today, at that time) */
function timeStringToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format Date → "HH:MM" */
function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Format "HH:MM" → "8:00 AM" for display */
function formatDisplay(t: string): string {
  return timeStringToDate(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MedicationForm({ familyId, initial, onSubmit, submitLabel }: Props) {
  const router  = useRouter();
  const { pets } = usePets(familyId);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(initial?.pet_id ?? null);
  const [name, setName]     = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [frequency, setFrequency] = useState(initial?.frequency ?? 1);
  const [reminderTimes, setReminderTimes] = useState<string[]>(
    defaultTimes(initial?.frequency ?? 1, initial?.reminder_times ?? []),
  );
  const [saving, setSaving] = useState(false);

  // Time-picker modal state (one picker shared, shown for a specific dose slot)
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pickerDate, setPickerDate]   = useState<Date>(new Date());

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null;

  function changeFrequency(f: number) {
    setFrequency(f);
    setReminderTimes(defaultTimes(f, reminderTimes));
  }

  function openPicker(index: number) {
    setPickerDate(timeStringToDate(reminderTimes[index] ?? '08:00'));
    setPickerIndex(index);
  }

  function closePicker() {
    setPickerIndex(null);
  }

  function commitTime(date: Date) {
    if (pickerIndex === null) return;
    setReminderTimes((prev) => {
      const next = [...prev];
      next[pickerIndex] = dateToTimeString(date);
      return next;
    });
  }

  // Android fires onChange directly; iOS waits for Done
  function handleAndroidChange(_: unknown, date?: Date) {
    closePicker();
    if (date) commitTime(date);
  }

  async function handleSubmit() {
    if (!selectedPetId || !selectedPet) {
      Alert.alert('Missing field', 'Please select a pet.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing field', 'Please enter a medication name.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        pet_id: selectedPetId,
        pet_name: selectedPet.name,
        name: name.trim(),
        dosage: dosage.trim() || null,
        frequency,
        reminder_times: reminderTimes.slice(0, frequency),
        active: initial?.active ?? true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pet picker */}
        <Field label="Pet">
          {pets.length === 0 ? (
            <View style={styles.noPetsBox}>
              <Text style={styles.noPetsText}>No pets added yet.</Text>
              <TouchableOpacity style={styles.addPetLink} onPress={() => router.push('/pet/new')}>
                <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.addPetLinkText}>Add a pet first</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.petPickerRow}>
              {pets.map((pet) => {
                const isSelected = pet.id === selectedPetId;
                const photoUrl = getPetPhotoUrl(pet.profile_photo_path);
                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={[styles.petChip, isSelected && styles.petChipSelected]}
                    onPress={() => setSelectedPetId(pet.id)}
                    activeOpacity={0.75}
                  >
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.petChipPhoto} />
                    ) : (
                      <View style={[styles.petChipPhoto, styles.petChipPhotoPlaceholder]}>
                        <Ionicons name="paw" size={14} color={isSelected ? theme.colors.primary : theme.colors.textLight} />
                      </View>
                    )}
                    <Text style={[styles.petChipName, isSelected && styles.petChipNameSelected]}>
                      {pet.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Field>

        {/* Medication name */}
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

        {/* Dosage */}
        <Field label="Dosage (optional)">
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="e.g. 2.5ml, 1 tablet"
            placeholderTextColor={theme.colors.textLight}
          />
        </Field>

        {/* Frequency */}
        <Field label="Doses per day">
          <View style={styles.frequencyRow}>
            {[1, 2, 3, 4].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.freqButton, frequency === f && styles.freqButtonActive]}
                onPress={() => changeFrequency(f)}
              >
                <Text style={[styles.freqButtonText, frequency === f && styles.freqButtonTextActive]}>
                  {f}×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* Reminder times — native time picker */}
        <Field label={frequency === 1 ? 'Reminder time' : 'Reminder times'}>
          <View style={styles.timesColumn}>
            {Array.from({ length: frequency }, (_, i) => {
              const isOpen = pickerIndex === i;
              return (
                <View key={i}>
                  <TouchableOpacity
                    style={styles.timeRow}
                    onPress={() => isOpen ? closePicker() : openPicker(i)}
                    activeOpacity={0.75}
                  >
                    {frequency > 1 && (
                      <Text style={styles.doseLabel}>Dose {i + 1}</Text>
                    )}
                    <View style={[styles.timeButton, isOpen && styles.timeButtonOpen]}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.timeButtonText}>
                        {formatDisplay(reminderTimes[i] ?? '08:00')}
                      </Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={theme.colors.textLight}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* iOS: inline spinner — avoids Modal rendering bug */}
                  {isOpen && Platform.OS === 'ios' && (
                    <View style={styles.inlinePickerWrap}>
                      <DateTimePicker
                        value={pickerDate}
                        mode="time"
                        display="spinner"
                        onChange={(_, date) => {
                          if (date) { setPickerDate(date); commitTime(date); }
                        }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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

      {/* Android: dialog picker rendered outside the scroll view */}
      {Platform.OS === 'android' && pickerIndex !== null && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={handleAndroidChange}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 48 },

  field: { marginBottom: theme.spacing.md },
  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: theme.colors.textPrimary,
  },

  // Pet picker
  noPetsBox: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.border,
    padding: theme.spacing.md, alignItems: 'center', gap: 8,
  },
  noPetsText: { fontSize: 14, color: theme.colors.textSecondary },
  addPetLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPetLinkText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  petPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  petChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.border,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  petChipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  petChipPhoto: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.border },
  petChipPhotoPlaceholder: { backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  petChipName: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  petChipNameSelected: { color: theme.colors.primary },

  // Frequency
  frequencyRow: { flexDirection: 'row', gap: 10 },
  freqButton: {
    flex: 1, paddingVertical: 12, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, alignItems: 'center',
  },
  freqButtonActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  freqButtonText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  freqButtonTextActive: { color: theme.colors.primary },

  // Time picker rows
  timesColumn: { gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doseLabel: { fontSize: 13, color: theme.colors.textSecondary, width: 48 },
  timeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  timeButtonText: {
    flex: 1, fontSize: 16, fontWeight: '500', color: theme.colors.textPrimary,
  },
  timeButtonOpen: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  inlinePickerWrap: {
    alignItems: 'center',
  },

  // Submit
  submitButton: {
    backgroundColor: theme.colors.primary, borderRadius: theme.radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: theme.spacing.md,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

});
