import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
