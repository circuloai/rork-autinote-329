import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomReminder, QuickReminder, ReminderTone } from '@/types';
import { getRepeatDays, parseReminderTime, toExpoWeekdays } from '@/lib/reminderUtils';

const NOTIFICATION_SETUP_KEY = '@autinote_notifications_setup';
const SCHEDULED_REMINDER_IDS_KEY = '@autinote_scheduled_reminder_ids';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 200, 100],
      });
    }

    await AsyncStorage.setItem(NOTIFICATION_SETUP_KEY, 'true');
    return true;
  } catch (error) {
    console.error('[Notifications] Setup error:', error);
    return false;
  }
}

export async function isNotificationsSetup(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATION_SETUP_KEY);
  return val === 'true';
}

export async function scheduleReminder(
  id: string,
  time: string,
  message: string,
  repeatDays?: number[],
  tone: ReminderTone = 'chime',
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Device reminders are available in the iOS and Android apps.');
  }

  const minutesAfterMidnight = parseReminderTime(time);
  if (minutesAfterMidnight === null) {
    throw new Error('Choose a valid reminder time.');
  }

  const hours = Math.floor(minutesAfterMidnight / 60);
  const minutes = minutesAfterMidnight % 60;
  await cancelReminder(id);

  const ids: string[] = [];
  const days = toExpoWeekdays(repeatDays);
  const scheduledDays = days && days.length > 0 ? days : [undefined];

  for (const expoWeekday of scheduledDays) {
    const trigger: any = expoWeekday === undefined
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour: hours,
          minute: minutes,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'AutiNote Reminder',
        body: message,
        sound: tone === 'chime' ? 'default' : undefined,
      },
      trigger,
    });
    ids.push(notificationId);
  }

  const scheduled = await getScheduledReminderIds();
  scheduled[id] = ids;
  await AsyncStorage.setItem(SCHEDULED_REMINDER_IDS_KEY, JSON.stringify(scheduled));
}

export async function sendChatNotification(fromName: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `chat_${Date.now()}`,
      content: {
        title: fromName,
        body: 'Sent you a new message',
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[Notifications] Chat notification error:', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    const scheduled = await getScheduledReminderIds();
    await Promise.all(Object.values(scheduled).flat().map((id) =>
      Notifications.cancelScheduledNotificationAsync(id),
    ));
    await AsyncStorage.removeItem(SCHEDULED_REMINDER_IDS_KEY);
  } catch (error) {
    console.error('[Notifications] Cancel all error:', error);
  }
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    const scheduled = await getScheduledReminderIds();
    const ids = scheduled[id] || [];
    await Promise.all(ids.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId),
    ));
    delete scheduled[id];
    await AsyncStorage.setItem(SCHEDULED_REMINDER_IDS_KEY, JSON.stringify(scheduled));
  } catch (error) {
    console.error('[Notifications] Cancel error:', error);
  }
}

export type ReminderSyncResult = {
  success: boolean;
  reason?: 'permission-denied' | 'unsupported' | 'error';
  error?: unknown;
};

async function getScheduledReminderIds(): Promise<Record<string, string[]>> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_REMINDER_IDS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function syncReminderNotifications(
  quickReminders: QuickReminder[] = [],
  customReminders: CustomReminder[] = [],
): Promise<ReminderSyncResult> {
  const enabledQuick = quickReminders.filter((reminder) => reminder.enabled);
  const enabledCustom = customReminders.filter((reminder) => reminder.enabled);
  const activeIds = new Set([
    ...enabledQuick.map((reminder) => `quick:${reminder.id}`),
    ...enabledCustom.map((reminder) => `custom:${reminder.id}`),
  ]);

  try {
    const scheduled = await getScheduledReminderIds();
    await Promise.all(
      Object.keys(scheduled)
        .filter((id) => !activeIds.has(id))
        .map((id) => cancelReminder(id)),
    );

    if (enabledQuick.length === 0 && enabledCustom.length === 0) {
      return { success: true };
    }
    if (Platform.OS === 'web') {
      return { success: false, reason: 'unsupported' };
    }
    if (!(await requestNotificationPermissions())) {
      return { success: false, reason: 'permission-denied' };
    }

    for (const reminder of enabledQuick) {
      await scheduleReminder(
        `quick:${reminder.id}`,
        reminder.time || '08:00',
        'Take a moment to check in with yourself.',
      );
    }
    for (const reminder of enabledCustom) {
      const repeatDays = getRepeatDays(reminder.repeat, reminder.customDays);
      if (reminder.repeat === 'custom' && (!repeatDays || repeatDays.length === 0)) {
        throw new Error(`Choose at least one day for "${reminder.label}".`);
      }
      await scheduleReminder(
        `custom:${reminder.id}`,
        reminder.time,
        reminder.message || reminder.label,
        repeatDays,
        reminder.tone,
      );
    }
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Reminder sync error:', error);
    return { success: false, reason: 'error', error };
  }
}
