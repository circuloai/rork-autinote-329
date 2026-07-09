import { useColorScheme } from 'react-native';
import { getColors } from '@/constants/colors';
import type { Preferences } from '@/types';

/**
 * Hook version of getColors() that resolves `theme: 'auto'` against the
 * actual iOS/Android system color scheme. Use this everywhere instead of
 * calling getColors(preferences) directly inside components.
 *
 * Drop-in replacement:
 *   - Before: const Colors = useMemo(() => getColors(preferences), [preferences]);
 *   - After:  const Colors = useColors(preferences);
 */
export function useColors(preferences?: Preferences | null) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  return getColors(preferences, systemScheme ?? 'light');
}
