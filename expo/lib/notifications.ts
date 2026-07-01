import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETUP_KEY = '@autinote_notifications_setup';

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
  repeatDays?: number[]
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);

    const [hours, minutes] = time.split(':').map(Number);

    // Schedule a daily notification
    const trigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    };

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: 'AutiNote Reminder',
        body: message,
        sound: 'default',
      },
      trigger,
    });

    // For additional repeat days, schedule extra daily notifications with unique IDs
    if (repeatDays && repeatDays.length > 1) {
      for (let i = 1; i < repeatDays.length; i++) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${id}_${repeatDays[i]}`,
          content: {
            title: 'AutiNote Reminder',
            body: message,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
            channelId: Platform.OS === 'android' ? 'reminders' : undefined,
          } as any,
        });
      }
    }
  } catch (error) {
    console.error('[Notifications] Schedule error:', error);
  }
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
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Cancel all error:', error);
  }
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error('[Notifications] Cancel error:', error);
  }
}
