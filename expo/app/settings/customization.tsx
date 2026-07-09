import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Check, Moon } from 'lucide-react-native';
import { getFontScale } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import ScaledText from '@/components/ScaledText';
import type { Preferences } from '@/types';

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
};

export default function CustomizationScreen() {
  const { preferences, savePreferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [fontSize, setFontSize] = useState<FontSize>((preferences?.fontSize as FontSize) || 'medium');
  // Preview scale based on the locally selected size (not yet saved)
  const previewScale = useMemo(() => getFontScale({ fontSize } as Preferences), [fontSize]);

  const isDarkMode = preferences?.theme === 'dark';
  const handleToggleDark = useCallback((value: boolean) => {
    if (preferences) {
      savePreferences({ ...preferences, theme: value ? 'dark' : 'light' });
    }
  }, [preferences, savePreferences]);

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize);
    if (preferences) {
      savePreferences({
        ...preferences,
        fontSize: newSize,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Appearance',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginTop: 24 }]}>
          <ScaledText style={styles.sectionTitle}>APPEARANCE</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Moon size={24} color={Colors.text} />
              </View>
              <View style={styles.settingContent}>
                <ScaledText style={styles.settingTitle}>Dark Mode</ScaledText>
                <ScaledText style={styles.settingSubtitle}>
                  {isDarkMode ? 'Dark theme active' : 'Light theme active'}
                </ScaledText>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleDark}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
                ios_backgroundColor={Colors.border}
                testID="dark-mode-toggle"
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>TEXT SIZE</ScaledText>
        </View>

        <View style={[styles.section, { marginTop: 0 }]}>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <ScaledText style={styles.settingTitle}>Font Size</ScaledText>
                <ScaledText style={styles.settingSubtitle}>Adjust text size for better readability</ScaledText>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => {
                const optionScale = getFontScale({ fontSize: size } as Preferences);
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionButton,
                      fontSize === size && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleFontSizeChange(size)}
                    activeOpacity={0.7}
                    testID={`font-size-${size}`}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionText,
                          { fontSize: Math.round(16 * optionScale) },
                          fontSize === size && styles.optionTextSelected,
                        ]}
                      >
                        {FONT_SIZE_LABELS[size]}
                      </Text>
                      {fontSize === size && <Check size={20} color={Colors.primary} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>
        </View>

        <View style={styles.previewSection}>
          <ScaledText style={styles.sectionTitle}>PREVIEW</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.previewContent}>
              <Text style={[styles.previewTitle, { fontSize: Math.round(20 * previewScale) }]}>
                Sample Text
              </Text>
              <Text style={[styles.previewBody, { fontSize: Math.round(16 * previewScale), lineHeight: Math.round(24 * previewScale) }]}>
                This is how your text will appear throughout the app with the selected font size. Daily logs, insights, and all other content will use this size.
              </Text>
            </View>
          </GlassCard>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionsContainer: {
    padding: 16,
    gap: 12,
  },
  optionButton: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  previewSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  previewContent: {
    padding: 20,
  },
  previewTitle: {
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  previewBody: {
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
