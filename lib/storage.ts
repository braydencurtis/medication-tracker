import { supabase } from './supabase';

const PET_PHOTOS_BUCKET = 'pet-photos';
const AVATARS_BUCKET    = 'avatars';

/** Returns the public URL for a pet photo storage path, or null if no path given. */
export function getPetPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl ?? null;
}

/** Returns the public URL for a user avatar storage path, or null if no path given. */
export function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}

/**
 * Uploads a user avatar to the avatars bucket.
 * Returns the storage path on success, or null on failure.
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${userId}/avatar.${ext}`;

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('uploadAvatar error:', error);
      return null;
    }
    return path;
  } catch (err) {
    console.error('uploadAvatar exception:', err);
    return null;
  }
}

/**
 * Uploads an image (local URI from expo-image-picker) to the pet-photos bucket.
 * Returns the storage path on success, or null on failure.
 */
export async function uploadPetPhoto(
  familyId: string,
  petId: string,
  localUri: string,
  slot: 'profile' | string = 'profile',
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${familyId}/${petId}/${slot}.${ext}`;

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('uploadPetPhoto error:', error);
      return null;
    }

    return path;
  } catch (err) {
    console.error('uploadPetPhoto exception:', err);
    return null;
  }
}
