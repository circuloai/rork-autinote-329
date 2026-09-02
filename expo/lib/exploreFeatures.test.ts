import { describe, expect, test } from 'bun:test';
import {
  EXPLORE_FEATURES,
  getExploreAvailability,
} from './exploreFeatures';

describe('Explore First feature inventory', () => {
  test('stays aligned with the current user-facing feature set', () => {
    expect(EXPLORE_FEATURES.map((feature) => feature.title)).toEqual([
      'Home',
      'Daily Log',
      'Meltdown Log',
      'Calendar',
      'Insights',
      'Autumn',
      'Shared Access',
      'Settings',
    ]);
  });

  test('keeps guest previews safe and gates account actions', () => {
    const guest = { hasSession: false, hasProfile: false, hasActiveChild: false };
    const home = EXPLORE_FEATURES.find((feature) => feature.id === 'home')!;
    const dailyLog = EXPLORE_FEATURES.find((feature) => feature.id === 'daily-log')!;
    const settings = EXPLORE_FEATURES.find((feature) => feature.id === 'settings')!;

    expect(getExploreAvailability(home, guest)).toBe('available');
    expect(getExploreAvailability(dailyLog, guest)).toBe('sign-in');
    expect(getExploreAvailability(settings, guest)).toBe('sign-in');
  });

  test('asks a signed-in account without a child to finish setup', () => {
    const feature = EXPLORE_FEATURES.find((item) => item.id === 'autumn')!;
    expect(getExploreAvailability(feature, {
      hasSession: true,
      hasProfile: true,
      hasActiveChild: false,
    })).toBe('setup');
  });
});