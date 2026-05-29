import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMedications } from '../../hooks/useMedications';
import { useAuth } from '../../context/AuthContext';
import {
  cancelAllForMedication,
  scheduleReminders,
} from '../../lib/notifications';
import { MedicationForm, type MedicationFormValues } from '../../components/MedicationForm';
import { theme } from '../../constants/theme';
import type { Medication } from '../../types';

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { familyId } = useAuth();
  const { medications, updateMedication } = useMedications(familyId);

  const medication = medications.find((m) => m.id === id);

  if (!medication) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Medication not found.</Text>
      </View>
    );
  }

  async function handleSubmit(values: MedicationFormValues) {
    const { error } = await updateMedication(id, values);
    if (error) {
      Alert.alert('Error', 'Could not update medication. Please try again.');
      return;
    }
    // Reschedule: cancel old notifications and re-schedule with new times
    await cancelAllForMedication(id);
    const updatedMed: Medication = { ...medication, ...values } as Medication;
    scheduleReminders([updatedMed], []).catch(console.error);
    router.back();
  }

  return (
    <MedicationForm
      familyId={familyId}
      initial={medication}
      onSubmit={handleSubmit}
      submitLabel="Save changes"
    />
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  notFoundText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
