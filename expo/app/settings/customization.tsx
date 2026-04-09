import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Check } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';

export default function CustomizationScreen() {
  const { preferences, savePreferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(preferences?.theme || 'light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(preferences?.fontSize || 'medium');

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    if (preferences) {
      savePreferences({
        ...preferences,
        theme: newTheme,
      });
    }
  };

  const handleFontSizeChange = (newSize: 'small' | 'medium' | 'large') => {
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
          title: 'Customization',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Theme</Text>
                <Text style={styles.settingSubtitle}>Choose light or dark mode</Text>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  theme === 'light' && styles.optionButtonSelected,
                ]}
                onPress={() => handleThemeChange('light')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionText,
                      theme === 'light' && styles.optionTextSelected,
                    ]}
                  >
                    Light
                  </Text>
                  {theme === 'light' && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  theme === 'dark' && styles.optionButtonSelected,
                ]}
                onPress={() => handleThemeChange('dark')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionText,
                      theme === 'dark' && styles.optionTextSelected,
                    ]}
                  >
                    Dark
                  </Text>
                  {theme === 'dark' && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  theme === 'auto' && styles.optionButtonSelected,
                ]}
                onPress={() => handleThemeChange('auto')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionText,
                      theme === 'auto' && styles.optionTextSelected,
                    ]}
                  >
                    Auto
                  </Text>
                  {theme === 'auto' && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEXT SIZE</Text>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Font Size</Text>
                <Text style={styles.settingSubtitle}>Adjust text size for better readability</Text>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  fontSize === 'small' && styles.optionButtonSelected,
                ]}
                onPress={() => handleFontSizeChange('small')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionText,
                      { fontSize: 14 },
                      fontSize === 'small' && styles.optionTextSelected,
                    ]}
                  >
                    Small
                  </Text>
                  {fontSize === 'small' && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  fontSize === 'medium' && styles.optionButtonSelected,
                ]}
                onPress={() => handleFontSizeChange('medium')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionText,
                      { fontSize: 16 },
                      fontSize === 'medium' && styles.optionTextSelected,
                    ]}
                  >
                    Medium
                  </Text>
                  {fontSize === 'medium' && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  fontSize === 'large' && styles.optionButtonSelected,
                ]}
                onPress={() => handleFontSizeChange('large')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionText,
                      { fontSize: 18 },
                      fontSize === 'large' && styles.optionTextSelected,
                    ]}
                  >
                    Large
                  </Text>
                  {fontSize === 'large' && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.previewContent}>
              <Text style={[styles.previewTitle, { fontSize: fontSize === 'small' ? 18 : fontSize === 'large' ? 22 : 20 }]}>
                Sample Text
              </Text>
              <Text style={[styles.previewBody, { fontSize: fontSize === 'small' ? 14 : fontSize === 'large' ? 18 : 16 }]}>
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
    marginBottom: 24,
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
