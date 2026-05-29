import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usePets } from '../../hooks/usePets';
import { useMedications } from '../../hooks/useMedications';
import { getPetPhotoUrl } from '../../lib/storage';
import { theme } from '../../constants/theme';
import type { Pet } from '../../types';

export default function PetsScreen() {
  const router = useRouter();
  const { familyId } = useAuth();
  const { pets, loading } = usePets(familyId);
  const { medications } = useMedications(familyId);

  function medCountForPet(petId: string) {
    return medications.filter((m) => m.pet_id === petId && m.active).length;
  }

  function renderItem({ item }: { item: Pet }) {
    const photoUrl = getPetPhotoUrl(item.profile_photo_path);
    const activeMeds = medCountForPet(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/pet/${item.id}`)}
        activeOpacity={0.8}
      >
        {/* Photo */}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.cardPhoto} />
        ) : (
          <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
            <Ionicons name="paw" size={28} color={theme.colors.primary} />
          </View>
        )}

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          {(item.species || item.breed) && (
            <Text style={styles.cardBreed}>
              {[item.species, item.breed].filter(Boolean).join(' · ')}
            </Text>
          )}
          <View style={styles.medBadgeRow}>
            <Ionicons
              name="medical-outline"
              size={12}
              color={
                activeMeds > 0
                  ? theme.colors.primary
                  : theme.colors.textLight
              }
            />
            <Text
              style={[
                styles.medBadgeText,
                activeMeds > 0
                  ? styles.medBadgeActive
                  : styles.medBadgeInactive,
              ]}
            >
              {activeMeds === 0
                ? 'No active medications'
                : activeMeds === 1
                ? '1 active medication'
                : `${activeMeds} active medications`}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textLight}
        />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Pets</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyTitle}>No pets yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add your first pet.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/pet/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: theme.spacing.lg },
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  separator: { height: theme.spacing.sm },

  cardPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.border,
  },
  cardPhotoPlaceholder: {
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardInfo: { flex: 1, gap: 3 },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardBreed: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  medBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  medBadgeText: { fontSize: 12, fontWeight: '500' },
  medBadgeActive: { color: theme.colors.primary },
  medBadgeInactive: { color: theme.colors.textLight },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary },

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
