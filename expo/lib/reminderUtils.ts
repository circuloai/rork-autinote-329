export const REMINDER_WEEKDAYS = [
  { value: 1, shortLabel: 'Mon', label: 'Monday' },
  { value: 2, shortLabel: 'Tue', label: 'Tuesday' },
  { value: 3, shortLabel: 'Wed', label: 'Wednesday' },
  { value: 4, shortLabel: 'Thu', label: 'Thursday' },
  { value: 5, shortLabel: 'Fri', label: 'Friday' },
  { value: 6, shortLabel: 'Sat', label: 'Saturday' },
  { value: 0, shortLabel: 'Sun', label: 'Sunday' },
] as const;

export type ReminderWeekday = (typeof REMINDER_WEEKDAYS)[number]['value'];

/**
 * Converts either a stored 24-hour value or a displayed 12-hour value into
 * minutes after midnight. Invalid values return null instead of becoming 0,
 * which would incorrectly make a reminder look overdue.
 */
export function parseReminderTime(value?: string | null): number | null {
  if (!value) return null;
  const time = value.trim();

  const time24 = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (time24) {
    return Number(time24[1]) * 60 + Number(time24[2]);
  }

  const time12 = time.match(/^([1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
  if (!time12) return null;

  let hours = Number(time12[1]);
  const minutes = Number(time12[2]);
  const period = time12[3].toUpperCase();
  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

export function formatReminderTime(value?: string | null): string {
  const minutes = parseReminderTime(value);
  if (minutes === null) return value?.trim() || 'Choose a time';

  const hours24 = Math.floor(minutes / 60);
  const minute = (minutes % 60).toString().padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minute} ${period}`;
}

export function toStoredReminderTime(hours12: number, minute: number, period: 'AM' | 'PM'): string {
  let hours24 = hours12 % 12;
  if (period === 'PM') hours24 += 12;
  return `${hours24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function getRepeatDays(
  repeat: 'daily' | 'weekdays' | 'custom',
  customDays?: number[],
): number[] | undefined {
  if (repeat === 'daily') return undefined;
  if (repeat === 'weekdays') return [1, 2, 3, 4, 5];
  return [...new Set((customDays || []).filter((day) => day >= 0 && day <= 6))].sort(
    (a, b) => a - b,
  );
}

export function isReminderScheduledToday(
  repeat: 'daily' | 'weekdays' | 'custom',
  customDays: number[] | undefined,
  date: Date,
): boolean {
  if (repeat === 'daily') return true;
  const day = date.getDay();
  if (repeat === 'weekdays') return day >= 1 && day <= 5;
  return customDays?.includes(day) ?? false;
}

export function formatRepeatLabel(repeat: 'daily' | 'weekdays' | 'custom', customDays?: number[]): string {
  if (repeat !== 'custom') return repeat.charAt(0).toUpperCase() + repeat.slice(1);
  const labels = (customDays || [])
    .slice()
    .sort((a, b) => a - b)
    .map((day) => REMINDER_WEEKDAYS.find((weekday) => weekday.value === day)?.shortLabel)
    .filter(Boolean);
  return labels.length > 0 ? `Custom (${labels.join(', ')})` : 'Custom';
}

export function classifyReminderTime(
  value: string | undefined | null,
  currentMinutes: number,
): 'upcoming' | 'earlier' | null {
  const reminderMinutes = parseReminderTime(value);
  if (reminderMinutes === null) return null;
  return reminderMinutes > currentMinutes ? 'upcoming' : 'earlier';
}

/** Expo's weekly trigger uses 1=Sunday through 7=Saturday. */
export function toExpoWeekdays(days?: number[]): number[] | undefined {
  if (!days || days.length === 0) return undefined;
  return [...new Set(days)]
    .filter((day) => day >= 0 && day <= 6)
    .map((day) => (day === 0 ? 1 : day + 1))
    .sort((a, b) => a - b);
}