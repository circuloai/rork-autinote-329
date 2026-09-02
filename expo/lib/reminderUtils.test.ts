import { describe, expect, test } from 'bun:test';
import {
  formatReminderTime,
  formatRepeatLabel,
  getRepeatDays,
  isReminderScheduledToday,
  classifyReminderTime,
  parseReminderTime,
  toExpoWeekdays,
  toStoredReminderTime,
} from './reminderUtils';

describe('reminder time utilities', () => {
  test('parses both stored 24-hour and displayed 12-hour values', () => {
    expect(parseReminderTime('07:00')).toBe(420);
    expect(parseReminderTime('1:05 PM')).toBe(785);
    expect(parseReminderTime('12:00 AM')).toBe(0);
    expect(parseReminderTime('25:00')).toBeNull();
  });

  test('formats values consistently for users', () => {
    expect(formatReminderTime('07:00')).toBe('7:00 AM');
    expect(formatReminderTime('13:00')).toBe('1:00 PM');
    expect(toStoredReminderTime(9, 30, 'PM')).toBe('21:30');
  });

  test('returns the correct repeat-day values', () => {
    expect(getRepeatDays('daily')).toBeUndefined();
    expect(getRepeatDays('weekdays')).toEqual([1, 2, 3, 4, 5]);
    expect(getRepeatDays('custom', [5, 1, 5, 0])).toEqual([0, 1, 5]);
    expect(formatRepeatLabel('custom', [1, 3, 5])).toBe('Custom (Mon, Wed, Fri)');
  });

  test('only includes a reminder when its repeat rule includes today', () => {
    const Wednesday = new Date(2026, 8, 2);
    expect(isReminderScheduledToday('weekdays', undefined, Wednesday)).toBe(true);
    expect(isReminderScheduledToday('custom', [0, 3], Wednesday)).toBe(true);
    expect(isReminderScheduledToday('custom', [1, 2], Wednesday)).toBe(false);
  });

  test('classifies valid reminder occurrences without treating invalid values as missed', () => {
    expect(classifyReminderTime('13:00', 12 * 60)).toBe('upcoming');
    expect(classifyReminderTime('11:59 AM', 12 * 60)).toBe('earlier');
    expect(classifyReminderTime('not-a-time', 12 * 60)).toBeNull();
  });

  test('maps JavaScript weekdays to Expo weekly trigger weekdays', () => {
    expect(toExpoWeekdays([0, 1, 5, 5])).toEqual([1, 2, 6]);
    expect(toExpoWeekdays([])).toBeUndefined();
  });
});