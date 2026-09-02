import type { AnyLogEntry } from '@/types';

export type ProgressTimeRange = 'week' | 'month' | '3months';

export const PROGRESS_RANGE_DAYS: Record<ProgressTimeRange, number> = {
  week: 7,
  month: 30,
  '3months': 90,
};

export function getLogDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function filterLogsByProgressRange(
  logs: AnyLogEntry[],
  range: ProgressTimeRange,
  now = new Date(),
): AnyLogEntry[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - PROGRESS_RANGE_DAYS[range] + 1);
  return logs.filter((log) => getLogDate(log.date) >= start);
}

export function calculateLoggingGoal(logs: AnyLogEntry[], range: ProgressTimeRange) {
  const loggedDays = new Set(
    logs.map((log) => getLogDate(log.date).toISOString().split('T')[0]),
  ).size;
  const targetDays = Math.ceil(PROGRESS_RANGE_DAYS[range] * 5 / 7);
  const milestones = [3, 7, 14, 30, 60, 90];
  const nextMilestone = milestones.find((milestone) => milestone > loggedDays) || milestones[milestones.length - 1];
  return {
    loggedDays,
    targetDays,
    percent: Math.min(100, Math.round((loggedDays / targetDays) * 100)),
    nextMilestone,
  };
}