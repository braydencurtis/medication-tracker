import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { uploadPetPhoto } from '../lib/storage';
import type { Pet } from '../types';

export function usePets(familyId: string | null = null) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`pets-${Math.random()}`).current;

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    fetchPets();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pets' },
        () => fetchPets(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  async function fetchPets() {
    if (!familyId) return;
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at');
    if (data) setPets(data);
    setLoading(false);
  }

  async function addPet(
    values: { name: string; species: string; breed: string },
    photoUri?: string,
  ): Promise<{ data: Pet | null; error: any }> {
    const { data, error } = await supabase
      .from('pets')
      .insert({
        family_id: familyId,
        name: values.name.trim(),
        species: values.species.trim() || null,
        breed: values.breed.trim() || null,
      })
      .select()
      .single();

    if (error || !data) return { data: null, error };

    let pet: Pet = data;

    if (photoUri && familyId) {
      const path = await uploadPetPhoto(familyId, pet.id, photoUri, 'profile');
      if (path) {
        const { data: updated } = await supabase
          .from('pets')
          .update({ profile_photo_path: path })
          .eq('id', pet.id)
          .select()
          .single();
        if (updated) pet = updated;
      }
    }

    setPets((prev) => [...prev, pet]);
    return { data: pet, error: null };
  }

  async function updatePet(
    id: string,
    values: { name: string; species: string; breed: string },
    photoUri?: string,
  ): Promise<{ data: Pet | null; error: any }> {
    const updates: Partial<Pet> = {
      name: values.name.trim(),
      species: values.species.trim() || null,
      breed: values.breed.trim() || null,
    };

    if (photoUri && familyId) {
      const path = await uploadPetPhoto(familyId, id, photoUri, 'profile');
      if (path) updates.profile_photo_path = path;
    }

    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (data) setPets((prev) => prev.map((p) => (p.id === id ? data : p)));
    return { data: data ?? null, error };
  }

  async function deletePet(id: string): Promise<{ error: any }> {
    const { error } = await supabase.from('pets').delete().eq('id', id);
    if (!error) setPets((prev) => prev.filter((p) => p.id !== id));
    return { error };
  }

  return {
    pets,
    loading,
    addPet,
    updatePet,
    deletePet,
    refetch: fetchPets,
  };
}
