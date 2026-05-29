import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { usePets } from '../../hooks/usePets';
import { PetForm, type PetFormValues } from '../../components/PetForm';
import { theme } from '../../constants/theme';
import type { Pet } from '../../types';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { familyId } = useAuth();
  const { pets, updatePet, deletePet } = usePets(familyId);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const found = pets.find((p) => p.id === id) ?? null;
    setPet(found);
    setLoaded(true);
  }, [pets, id]);

  async function handleSubmit(values: PetFormValues, photoUri?: string) {
    if (!id) return;
    const { error } = await updatePet(id, values, photoUri);
    if (error) {
      Alert.alert('Error', 'Could not update pet. Please try again.');
      return;
    }
    router.back();
  }

  function confirmDelete() {
    if (!id || !pet) return;
    Alert.alert(
      `Remove ${pet.name}?`,
      'This will delete the pet and remove them from all medications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePet(id);
            if (error) {
              Alert.alert('Error', 'Could not delete pet.');
            } else {
              router.back();
            }
          },
        },
      ],
    );
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Pet not found.</Text>
      </View>
    );
  }

  return (
    <PetForm
      initial={pet}
      onSubmit={handleSubmit}
      submitLabel="Save changes"
      onDelete={confirmDelete}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: theme.colors.textSecondary },
});
