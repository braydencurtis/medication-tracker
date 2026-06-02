import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import type { Medication, DoseLog } from '../types';

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPushToken(userId: string): Promise<void> {
  let token: string;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = result.data;
    console.log('[Push] token obtained:', token);
  } catch (err) {
    console.warn('[Push] getExpoPushTokenAsync failed:', err);
    return;
  }

  const { error: upsertError } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
  if (upsertError) console.warn('[Push] token upsert failed:', upsertError);
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminders(
  medications: Medication[],
  existingLogs: DoseLog[],
) {
  const today = todayDate();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduled.map((n) => n.identifier));

  for (const med of medications) {
    if (!med.active || med.reminder_times.length === 0) continue;

    for (let doseNum = 1; doseNum <= med.frequency; doseNum++) {
      const reminderTime = med.reminder_times[doseNum - 1];
      if (!reminderTime) continue;

      const [hour, minute] = reminderTime.split(':').map(Number);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        date.setHours(hour, minute, 0, 0);

        if (date <= new Date()) continue;

        // Skip days not in the medication's schedule
        const allowedDays = med.days_of_week;
        if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(date.getDay())) continue;

        const dateStr = isoDate(date);
        const id = notifId(med.id, doseNum, dateStr);

        // Skip if already given on that date
        if (dateStr === today) {
          const isGiven = existingLogs.some(
            (l) =>
              l.medication_id === med.id &&
              l.dose_number === doseNum &&
              l.dose_date === today &&
              l.given_at !== null,
          );
          if (isGiven) continue;
        }

        if (scheduledIds.has(id)) continue;

        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: `${med.pet_name}'s medication time`,
            body: `Time to give ${med.pet_name} ${med.name}${med.dosage ? ` (${med.dosage})` : ''}`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
          },
        });
      }
    }
  }
}

export async function cancelDoseNotification(
  medicationId: string,
  doseNumber: number,
  date: string,
) {
  await Notifications.cancelScheduledNotificationAsync(
    notifId(medicationId, doseNumber, date),
  );
}

/** Sends a push notification to every other family member when a dose is given. */
export async function sendDoseGivenNotification(params: {
  currentUserId: string;
  petName: string;
  medName: string;
  givenBy: string;
}): Promise<void> {
  const { currentUserId, petName, medName, givenBy } = params;
  try {
    // RLS on push_tokens ensures we only see rows for our own family
    const { data: rows, error: fetchError } = await supabase
      .from('push_tokens')
      .select('token')
      .neq('user_id', currentUserId);

    if (fetchError) {
      console.warn('[Push] failed to fetch tokens:', fetchError);
      return;
    }
    if (!rows || rows.length === 0) {
      console.log('[Push] no other devices registered — skipping');
      return;
    }

    console.log(`[Push] sending to ${rows.length} device(s)`);

    const messages = rows.map(({ token }: { token: string }) => ({
      to: token,
      title: `${petName} got their ${medName} 💊`,
      body: `Given by ${givenBy}`,
      sound: 'default',
      data: { type: 'dose_given', senderId: currentUserId },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });
    const json = await res.json();
    console.log('[Push] Expo response:', JSON.stringify(json));
  } catch (err) {
    console.error('[Push] sendDoseGivenNotification error:', err);
  }
}

export async function cancelAllForMedication(medicationId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(`med-${medicationId}-`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function notifId(medicationId: string, doseNumber: number, date: string) {
  return `med-${medicationId}-dose-${doseNumber}-${date}`;
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function todayDate() {
  return isoDate(new Date());
}
