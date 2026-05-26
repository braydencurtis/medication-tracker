import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Medication } from '../types';

type NewMedication = Omit<Medication, 'id' | 'created_at'>;

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`all-medications-${Math.random()}`).current;

  useEffect(() => {
    fetchMedications();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medications' },
        () => fetchMedications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMedications() {
    const { data } = await supabase
      .from('medications')
      .select('*')
      .order('created_at');
    if (data) setMedications(data);
    setLoading(false);
  }

  async function addMedication(med: NewMedication) {
    const { data, error } = await supabase
      .from('medications')
      .insert(med)
      .select()
      .single();
    if (data) setMedications((prev) => [...prev, data]);
    return { data, error };
  }

  async function updateMedication(id: string, updates: Partial<Medication>) {
    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (data)
      setMedications((prev) => prev.map((m) => (m.id === id ? data : m)));
    return { data, error };
  }

  async function deleteMedication(id: string) {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);
    if (!error) setMedications((prev) => prev.filter((m) => m.id !== id));
    return { error };
  }

  async function toggleActive(id: string, active: boolean) {
    return updateMedication(id, { active });
  }

  return {
    medications,
    loading,
    addMedication,
    updateMedication,
    deleteMedication,
    toggleActive,
    refetch: fetchMedications,
  };
}
