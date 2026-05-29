import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { usePets } from '../../hooks/usePets';
import { PetForm, type PetFormValues } from '../../components/PetForm';

export default function NewPetScreen() {
  const router = useRouter();
  const { familyId } = useAuth();
  const { addPet } = usePets(familyId);

  async function handleSubmit(values: PetFormValues, photoUri?: string) {
    const { error } = await addPet(values, photoUri);
    if (error) {
      Alert.alert('Error', 'Could not save pet. Please try again.');
      return;
    }
    router.back();
  }

  return <PetForm onSubmit={handleSubmit} submitLabel="Add pet" />;
}
