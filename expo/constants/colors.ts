import type { Preferences } from '@/types';

type ColorTheme = 'warm' | 'mint' | 'lavender' | 'peach';
type Theme = 'light' | 'dark';

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

const FONT_SIZE_MULTIPLIERS: Record<FontSize, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
  xlarge: 1.30,
};

export function getFontScale(preferences?: Preferences | null): number {
  const size: FontSize = (preferences?.fontSize as FontSize) || 'medium';
  return FONT_SIZE_MULTIPLIERS[size];
}

const themeColors = {
  warm: {
    light: {
      background: '#F6F5F3',
      surface: '#E6E3DD',
      surfaceHover: '#D4CFC7',
      primary: '#261D15',
      primaryDark: '#1A130E',
      secondary: '#8C6B50',
      accent: '#C4893A',
      text: '#261D15',
      textSecondary: '#8C7A6B',
      textLight: '#B5A49A',
      border: '#D4CFC7',
      borderLight: '#EAE7E2',
    },
    dark: {
      background: '#1C1410',
      surface: '#2C211A',
      surfaceHover: '#3D2E24',
      primary: '#C4A882',
      primaryDark: '#D4B896',
      secondary: '#A68B6E',
      accent: '#C4893A',
      text: '#F5EFE8',
      textSecondary: '#C4A882',
      textLight: '#8C7A6B',
      border: '#3D2E24',
      borderLight: '#2C211A',
    },
  },
  mint: {
    light: {
      background: '#D4E9F7',
      surface: '#E8F2FB',
      surfaceHover: '#F3F4F6',
      primary: '#2563EB',
      primaryDark: '#1D4ED8',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      text: '#111827',
      textSecondary: '#6B7280',
      textLight: '#9CA3AF',
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
    },
    dark: {
      background: '#1B3A5C',
      surface: '#234B73',
      surfaceHover: '#4A5568',
      primary: '#60A5FA',
      primaryDark: '#60A5FA',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textLight: '#9CA3AF',
      border: '#4B5563',
      borderLight: '#374151',
    },
  },
  lavender: {
    light: {
      background: '#E5DEFF',
      surface: '#F0EBFF',
      surfaceHover: '#F3F4F6',
      primary: '#8B5CF6',
      primaryDark: '#7C3AED',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      text: '#111827',
      textSecondary: '#6B7280',
      textLight: '#9CA3AF',
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
    },
    dark: {
      background: '#2A2250',
      surface: '#362D65',
      surfaceHover: '#4A5568',
      primary: '#A78BFA',
      primaryDark: '#A78BFA',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textLight: '#9CA3AF',
      border: '#4B5563',
      borderLight: '#374151',
    },
  },
  peach: {
    light: {
      background: '#FFE5D9',
      surface: '#FFF0E8',
      surfaceHover: '#F3F4F6',
      primary: '#F97316',
      primaryDark: '#EA6B0B',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      text: '#111827',
      textSecondary: '#6B7280',
      textLight: '#9CA3AF',
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
    },
    dark: {
      background: '#3D2A1E',
      surface: '#4E3628',
      surfaceHover: '#4A5568',
      primary: '#FB923C',
      primaryDark: '#FB923C',
      secondary: '#7C3AED',
      accent: '#F59E0B',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textLight: '#9CA3AF',
      border: '#4B5563',
      borderLight: '#374151',
    },
  },
};

export function getColors(preferences?: Preferences | null) {
  const colorTheme: ColorTheme = (preferences?.colorTheme as ColorTheme) || 'warm';
  const theme: Theme = preferences?.theme === 'dark' ? 'dark' : 'light';

  const tc = themeColors[colorTheme]?.[theme] ?? themeColors.warm.light;

  return {
    primary: tc.primary,
    primaryDark: tc.primaryDark,
    secondary: tc.secondary,
    accent: tc.accent,

    success: '#5A8A5E',
    warning: '#C4893A',
    error: '#B85C4A',

    background: tc.background,
    surface: tc.surface,
    surfaceHover: tc.surfaceHover,

    text: tc.text,
    textSecondary: tc.textSecondary,
    textLight: tc.textLight,

    border: tc.border,
    borderLight: tc.borderLight,

    goodDay: '#5A8A5E',
    mixedDay: '#C4893A',
    challengingDay: '#B85C4A',
    noData: '#D4CFC7',

    moodHappy: '#5A8A5E',
    moodCalm: '#5B7FA6',
    moodAnxious: '#C4893A',
    moodSad: '#8C7A6B',
    moodAngry: '#B85C4A',

    light: {
      text: tc.text,
      background: tc.background,
      tint: tc.primary,
      tabIconDefault: tc.textLight,
      tabIconSelected: tc.primary,
    },
  };
}

export default getColors();
