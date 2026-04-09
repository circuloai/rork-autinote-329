import type { Preferences } from '@/types';

type ColorTheme = 'mint' | 'lavender' | 'peach';
type Theme = 'light' | 'dark';

const themeColors = {
  mint: {
    light: {
      background: '#D4E9F7',
      surface: '#E8F2FB',
      primary: '#2563EB',
    },
    dark: {
      background: '#1B3A5C',
      surface: '#234B73',
      primary: '#60A5FA',
    },
  },
  lavender: {
    light: {
      background: '#E5DEFF',
      surface: '#F0EBFF',
      primary: '#8B5CF6',
    },
    dark: {
      background: '#2A2250',
      surface: '#362D65',
      primary: '#A78BFA',
    },
  },
  peach: {
    light: {
      background: '#FFE5D9',
      surface: '#FFF0E8',
      primary: '#F97316',
    },
    dark: {
      background: '#3D2A1E',
      surface: '#4E3628',
      primary: '#FB923C',
    },
  },
};

export function getColors(preferences?: Preferences | null) {
  const colorTheme: ColorTheme = preferences?.colorTheme || 'mint';
  const theme: Theme = preferences?.theme === 'dark' ? 'dark' : 'light';
  
  const themeColor = themeColors[colorTheme][theme];
  
  return {
    primary: themeColor.primary,
    primaryDark: theme === 'dark' ? themeColor.primary : '#1D4ED8',
    secondary: '#7C3AED',
    accent: '#F59E0B',
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    
    background: themeColor.background,
    surface: themeColor.surface,
    surfaceHover: theme === 'dark' ? '#4A5568' : '#F3F4F6',
    
    text: theme === 'dark' ? '#F9FAFB' : '#111827',
    textSecondary: theme === 'dark' ? '#D1D5DB' : '#6B7280',
    textLight: theme === 'dark' ? '#9CA3AF' : '#9CA3AF',
    
    border: theme === 'dark' ? '#4B5563' : '#E5E7EB',
    borderLight: theme === 'dark' ? '#374151' : '#F3F4F6',
    
    goodDay: '#10B981',
    mixedDay: '#F59E0B',
    challengingDay: '#EF4444',
    noData: '#E5E7EB',
    
    moodHappy: '#10B981',
    moodCalm: '#3B82F6',
    moodAnxious: '#F59E0B',
    moodSad: '#6B7280',
    moodAngry: '#EF4444',
    
    light: {
      text: theme === 'dark' ? '#F9FAFB' : '#111827',
      background: themeColor.background,
      tint: themeColor.primary,
      tabIconDefault: '#9CA3AF',
      tabIconSelected: themeColor.primary,
    },
  };
}

export default getColors();
