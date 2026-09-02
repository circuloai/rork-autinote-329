export type ExploreFeatureId =
  | 'home'
  | 'daily-log'
  | 'meltdown-log'
  | 'calendar'
  | 'insights'
  | 'autumn'
  | 'shared-access'
  | 'settings';

export type ExploreFeature = {
  id: ExploreFeatureId;
  title: string;
  description: string;
  path: string;
  requiresAuth: boolean;
  requiresChild: boolean;
};

export const EXPLORE_FEATURES: ExploreFeature[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'See the daily dashboard and quick actions.',
    path: '/(tabs)/home',
    requiresAuth: false,
    requiresChild: false,
  },
  {
    id: 'daily-log',
    title: 'Daily Log',
    description: 'Record mood, sleep, tags, and daily highlights.',
    path: '/log/daily',
    requiresAuth: true,
    requiresChild: true,
  },
  {
    id: 'meltdown-log',
    title: 'Meltdown Log',
    description: 'Track triggers, intensity, duration, and strategies.',
    path: '/log/meltdown',
    requiresAuth: true,
    requiresChild: true,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Review entries and patterns by date.',
    path: '/calendar',
    requiresAuth: true,
    requiresChild: true,
  },
  {
    id: 'insights',
    title: 'Insights',
    description: 'Explore mood, sleep, behavior, and progress patterns.',
    path: '/(tabs)/insights',
    requiresAuth: false,
    requiresChild: false,
  },
  {
    id: 'autumn',
    title: 'Autumn',
    description: 'Ask the support companion thoughtful questions.',
    path: '/(tabs)/chat',
    requiresAuth: true,
    requiresChild: true,
  },
  {
    id: 'shared-access',
    title: 'Shared Access',
    description: 'Invite and collaborate with a therapist or caregiver.',
    path: '/settings/shared-access',
    requiresAuth: true,
    requiresChild: true,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Manage reminders, appearance, privacy, and your account.',
    path: '/(tabs)/settings',
    requiresAuth: true,
    requiresChild: false,
  },
];

export type ExploreAvailability = 'available' | 'sign-in' | 'setup';

export function getExploreAvailability(
  feature: ExploreFeature,
  state: { hasSession: boolean; hasProfile: boolean; hasActiveChild: boolean },
): ExploreAvailability {
  if (feature.requiresAuth && !state.hasSession) return 'sign-in';
  if (feature.requiresAuth && !state.hasProfile) return 'setup';
  if (feature.requiresChild && !state.hasActiveChild) return 'setup';
  return 'available';
}