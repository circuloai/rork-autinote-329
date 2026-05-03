import React, { useMemo, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Check } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
};

const FONT_SIZE_PX: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

export default function CustomizationScreen() {
  const { preferences, savePreferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [fontSize, setFontSize] = useState<FontSize>((preferences?.fontSize as FontSize) || 'medium');
  const titlePressCountRef = useRef<number>(0);
  const titlePressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize);
    if (preferences) {
      savePreferences({
        ...preferences,
        fontSize: newSize,
      });
    }
  };

  // Hidden dev override: long-press the Appearance screen title to toggle light/dark
  const handleTitleLongPress = () => {
    if (!preferences) return;
    const next = preferences.theme === 'light' ? 'dark' : 'light';
    savePreferences({ ...preferences, theme: next });
    Alert.alert('Theme override', `Theme set to ${next}. (Hidden dev setting)`);
  };

  // Tap counter alternative trigger (5 taps within 2s) for platforms without long-press feedback
  const handleTitleTap = () => {
    titlePressCountRef.current += 1;
    if (titlePressTimerRef.current) clearTimeout(titlePressTimerRef.current);
    if (titlePressCountRef.current >= 5) {
      titlePressCountRef.current = 0;
      handleTitleLongPress();
      return;
    }
    titlePressTimerRef.current = setTimeout(() => {
      titlePressCountRef.current = 0;
    }, 2000);
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
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={handleTitleLongPress}
          onPress={handleTitleTap}
          delayLongPress={800}
          style={styles.section}
          testID="appearance-title-area"
        >
          <Text style={styles.sectionTitle}>TEXT SIZE</Text>
        </TouchableOpacity>

        <View style={[styles.section, { marginTop: 0 }]}>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Font Size</Text>
                <Text style={styles.settingSubtitle}>Adjust text size for better readability</Text>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
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
                        { fontSize: FONT_SIZE_PX[size] },
                        fontSize === size && styles.optionTextSelected,
                      ]}
                    >
                      {FONT_SIZE_LABELS[size]}
                    </Text>
                    {fontSize === size && <Check size={20} color={Colors.primary} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.previewContent}>
              <Text style={[styles.previewTitle, { fontSize: FONT_SIZE_PX[fontSize] + 4 }]}>
                Sample Text
              </Text>
              <Text style={[styles.previewBody, { fontSize: FONT_SIZE_PX[fontSize] }]}>
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
