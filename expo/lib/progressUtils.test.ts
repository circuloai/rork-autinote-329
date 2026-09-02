import { describe, expect, test } from 'bun:test';
import type { AnyLogEntry } from '@/types';
import { calculateLoggingGoal, filterLogsByProgressRange } from './progressUtils';

const log = (date: string, id = date): AnyLogEntry => ({
  id,
  childId: 'child-1',
  date,
  type: 'daily',
  overallRating: 'great',
  moodTags: [],
  createdAt: `${date}T12:00:00.000Z`,
});

describe('progress settings calculations', () => {
  test('filters logs to the selected range, including the first day', () => {
    const now = new Date(2026, 8, 2, 15, 30);
    const result = filterLogsByProgressRange(
      [log('2026-09-02'), log('2026-08-27'), log('2026-08-26')],
      'week',
      now,
    );
    expect(result.map((entry) => entry.id)).toEqual(['2026-09-02', '2026-08-27']);
  });

  test('calculates unique logged days and caps completed goals at 100 percent', () => {
    const result = calculateLoggingGoal(
      [log('2026-09-01', 'a'), log('2026-09-01', 'b'), log('2026-08-31', 'c'), log('2026-08-30', 'd')],
      'week',
    );
    expect(result).toEqual({
      loggedDays: 3,
      targetDays: 5,
      percent: 60,
      nextMilestone: 7,
    });

    expect(calculateLoggingGoal(
      Array.from({ length: 8 }, (_, index) => log(`2026-08-${String(index + 1).padStart(2, '0')}`, String(index))),
      'week',
    ).percent).toBe(100);
  });
});