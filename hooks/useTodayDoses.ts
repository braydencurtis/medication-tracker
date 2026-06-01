import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { cancelDoseNotification } from '../lib/notifications';
import type { Medication, DoseLog, TodayDose } from '../types';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export function useTodayDoses() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelPrefix = useRef(`today-${Math.random()}`).current;

  const today = todayDate();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [medsResult, logsResult] = await Promise.all([
        supabase
          .from('medications')
          .select('*')
          .eq('active', true)
          .order('created_at'),
        supabase.from('dose_logs').select('*').eq('dose_date', today),
      ]);

      if (medsResult.error) throw medsResult.error;
      if (logsResult.error) throw logsResult.error;

      setMedications(medsResult.data ?? []);
      setDoseLogs(logsResult.data ?? []);
    } catch (e: unknown) {
      console.error('Supabase error:', JSON.stringify(e));
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : JSON.stringify(e);
      setError(msg || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchData();

    const medsChannel = supabase
      .channel(`${channelPrefix}-medications`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medications' },
        () => fetchData(),
      )
      .subscribe();

    const logsChannel = supabase
      .channel(`${channelPrefix}-dose-logs`)
      .on(
        'postgres_changes',
        // No date filter here — Supabase can't apply column filters to DELETE
        // events without REPLICA IDENTITY FULL. We guard in JS instead.
        { event: '*', schema: 'public', table: 'dose_logs' },
        (payload) => {
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {
            const newLog = payload.new as DoseLog;
            // Ignore changes for other days
            if (newLog.dose_date !== today) return;
            // Cancel the local reminder on THIS device whenever anyone marks
            // the dose as given — handles the "other person gave it" case.
            if (newLog.given_at) {
              cancelDoseNotification(
                newLog.medication_id,
                newLog.dose_number,
                newLog.dose_date,
              ).catch(console.error);
            }
            setDoseLogs((prev) => {
              const idx = prev.findIndex((l) => l.id === newLog.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = newLog;
                return next;
              }
              return [...prev, newLog];
            });
          } else if (payload.eventType === 'DELETE') {
            // payload.old always has at least the primary key (id)
            setDoseLogs((prev) =>
              prev.filter((l) => l.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(medsChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [fetchData, today]);

  async function markDoseGiven(
    medicationId: string,
    doseNumber: number,
    givenBy: string,
  ) {
    const { data, error } = await supabase
      .from('dose_logs')
      .upsert(
        {
          medication_id: medicationId,
          dose_number: doseNumber,
          dose_date: today,
          given_at: new Date().toISOString(),
          given_by: givenBy,
        },
        { onConflict: 'medication_id,dose_number,dose_date' },
      )
      .select()
      .single();

    if (!error && data) {
      setDoseLogs((prev) => {
        const idx = prev.findIndex(
          (l) =>
            l.medication_id === medicationId && l.dose_number === doseNumber,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });
    }
    return { error };
  }

  async function undoDose(medicationId: string, doseNumber: number) {
    const { error } = await supabase
      .from('dose_logs')
      .delete()
      .match({
        medication_id: medicationId,
        dose_number: doseNumber,
        dose_date: today,
      });

    if (!error) {
      setDoseLogs((prev) =>
        prev.filter(
          (l) =>
            !(
              l.medication_id === medicationId &&
              l.dose_number === doseNumber &&
              l.dose_date === today
            ),
        ),
      );
    }
    return { error };
  }

  const todayDoses: TodayDose[] = medications.flatMap((med) =>
    Array.from({ length: med.frequency }, (_, i) => {
      const doseNumber = i + 1;
      const log =
        doseLogs.find(
          (l) =>
            l.medication_id === med.id && l.dose_number === doseNumber,
        ) ?? null;
      return { medication: med, doseNumber, log };
    }),
  );

  return {
    todayDoses,
    medications,
    doseLogs,
    loading,
    error,
    markDoseGiven,
    undoDose,
    refetch: fetchData,
  };
}
