import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMedications } from '../../hooks/useMedications';
import { scheduleReminders } from '../../lib/notifications';
import { useAuth } from '../../context/AuthContext';
import { MedicationForm } from '../../components/MedicationForm';

export default function NewMedicationScreen() {
  const router = useRouter();
  const { familyId } = useAuth();
  const { addMedication, medications } = useMedications(familyId);

  async function handleSubmit(values: Parameters<typeof addMedication>[0]) {
    const { error } = await addMedication(values);
    if (error) {
      Alert.alert('Error', 'Could not save medication. Please try again.');
      return;
    }
    scheduleReminders(medications, []).catch(console.error);
    router.back();
  }

  return <MedicationForm onSubmit={handleSubmit} submitLabel="Add medication" />;
}
