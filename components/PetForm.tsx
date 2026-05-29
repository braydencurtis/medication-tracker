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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { getPetPhotoUrl } from '../lib/storage';
import type { Pet } from '../types';

export type PetFormValues = {
  name: string;
  species: string;
  breed: string;
};

interface Props {
  initial?: Pet;
  onSubmit: (values: PetFormValues, photoUri?: string) => Promise<void>;
  submitLabel: string;
  onDelete?: () => void;
}

export function PetForm({ initial, onSubmit, submitLabel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [species, setSpecies] = useState(initial?.species ?? '');
  const [breed, setBreed] = useState(initial?.breed ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Show new pick, then fall back to existing stored photo
  const displayPhotoUri =
    photoUri ?? getPetPhotoUrl(initial?.profile_photo_path) ?? null;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow access to your photo library in Settings.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Missing field', "Please enter your pet's name.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ name, species, breed }, photoUri ?? undefined);
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
      {/* Photo picker */}
      <View style={styles.photoSection}>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={pickPhoto}
          activeOpacity={0.8}
        >
          {displayPhotoUri ? (
            <Image source={{ uri: displayPhotoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons
                name="paw-outline"
                size={40}
                color={theme.colors.primary}
              />
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>Tap to add a photo</Text>
      </View>

      <Field label="Pet name *">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Penny"
          placeholderTextColor={theme.colors.textLight}
          autoCapitalize="words"
        />
      </Field>

      <Field label="Species (optional)">
        <TextInput
          style={styles.input}
          value={species}
          onChangeText={setSpecies}
          placeholder="e.g. Cat, Dog, Rabbit"
          placeholderTextColor={theme.colors.textLight}
          autoCapitalize="words"
        />
      </Field>

      <Field label="Breed (optional)">
        <TextInput
          style={styles.input}
          value={breed}
          onChangeText={setBreed}
          placeholder="e.g. Domestic Shorthair"
          placeholderTextColor={theme.colors.textLight}
          autoCapitalize="words"
        />
      </Field>

      <TouchableOpacity
        style={[styles.submitButton, saving && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteButtonText}>Delete pet</Text>
        </TouchableOpacity>
      )}
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 48 },

  photoSection: { alignItems: 'center', marginBottom: theme.spacing.lg },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'visible',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.border,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  photoHint: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  field: { marginBottom: theme.spacing.md },
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

  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  deleteButton: {
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.danger,
  },
});
