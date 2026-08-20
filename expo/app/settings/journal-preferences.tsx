import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Sparkles, BookOpen } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';

type LogCategory = 'mood' | 'behavior' | 'sleep' | 'food' | 'therapy';
type DefaultTag = 'happy' | 'calm' | 'anxious' | 'frustrated' | 'focused' | 'social' | 'sensory';

const CATEGORY_LABELS: Record<LogCategory, { label: string; emoji: string }> = {
  mood: { label: 'Mood tracking', emoji: '😊' },
  behavior: { label: 'Behavior tracking', emoji: '📊' },
  sleep: { label: 'Sleep logging', emoji: '😴' },
  food: { label: 'Food & nutrition', emoji: '🍽️' },
  therapy: { label: 'Therapy notes', emoji: '💙' },
};

const DEFAULT_TAG_OPTIONS: { value: DefaultTag; label: string; emoji: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'calm', label: 'Calm', emoji: '🍃' },
  { value: 'anxious', label: 'Anxious', emoji: '☁️' },
  { value: 'frustrated', label: 'Frustrated', emoji: '🔥' },
  { value: 'focused', label: 'Focused', emoji: '🎯' },
  { value: 'social', label: 'Social', emoji: '👥' },
  { value: 'sensory', label: 'Sensory', emoji: '🔊' },
];

export default function JournalPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, savePreferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [enabledCategories, setEnabledCategories] = useState<LogCategory[]>(
    (preferences as any)?.journalCategories || ['mood', 'behavior', 'sleep', 'food', 'therapy']
  );
  const [defaultTags, setDefaultTags] = useState<DefaultTag[]>(
    (preferences as any)?.journalDefaultTags || ['calm', 'anxious']
  );
  const [aiSuggestions, setAiSuggestions] = useState<boolean>(
    (preferences as any)?.journalAiSuggestions !== false
  );

  const toggleCategory = (cat: LogCategory) => {
    setEnabledCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleDefaultTag = (tag: DefaultTag) => {
    setDefaultTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    if (!preferences) return;
    savePreferences({
      ...preferences,
      ...({ journalCategories: enabledCategories } as any),
      ...({ journalDefaultTags: defaultTags } as any),
      ...({ journalAiSuggestions: aiSuggestions } as any),
    });
    Alert.alert('Saved', 'Journal preferences updated.');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Journal Preferences</ScaledText>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <ScaledText style={styles.saveBtnText}>Save</ScaledText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>LOG CATEGORIES</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }], idx, arr) => (
              <View
                key={key}
                style={[styles.row, idx !== arr.length - 1 && styles.rowBorder]}
              >
                <View style={styles.rowLeft}>
                  <ScaledText style={styles.emoji}>{emoji}</ScaledText>
                  <ScaledText style={styles.rowLabel}>{label}</ScaledText>
                </View>
                <Switch
                  value={enabledCategories.includes(key as LogCategory)}
                  onValueChange={() => toggleCategory(key as LogCategory)}
                  trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                  thumbColor={enabledCategories.includes(key as LogCategory) ? Colors.primary : Colors.textLight}
                />
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>DEFAULT MOOD TAGS</ScaledText>
          <ScaledText style={styles.sectionSubtitle}>These tags will appear at the top when you log a daily entry</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.tagsWrap}>
              {DEFAULT_TAG_OPTIONS.map((tag) => (
                <TouchableOpacity
                  key={tag.value}
                  style={[
                    styles.tagChip,
                    defaultTags.includes(tag.value) && styles.tagChipSelected,
                  ]}
                  onPress={() => toggleDefaultTag(tag.value)}
                  activeOpacity={0.7}
                >
                  <ScaledText style={styles.tagEmoji}>{tag.emoji}</ScaledText>
                  <ScaledText
                    style={[
                      styles.tagLabel,
                      defaultTags.includes(tag.value) && styles.tagLabelSelected,
                    ]}
                  >
                    {tag.label}
                  </ScaledText>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>LOGGING SUGGESTIONS</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Sparkles size={20} color={Colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <ScaledText style={styles.rowLabel}>On-device logging suggestions</ScaledText>
                  <ScaledText style={styles.rowDesc}>Show quick matches from the app’s built-in suggestion lists while you type</ScaledText>
                </View>
              </View>
              <Switch
                value={aiSuggestions}
                onValueChange={setAiSuggestions}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={aiSuggestions ? Colors.primary : Colors.textLight}
              />
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: Colors.background,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
    saveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: Colors.primary,
      borderRadius: 12,
    },
    saveBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.surface },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: Colors.textSecondary,
      marginBottom: 12,
      marginTop: -4,
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    emoji: { fontSize: 20, marginRight: 12 },
    rowLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.text },
    rowDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    tagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 16,
    },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: Colors.background,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    tagChipSelected: {
      backgroundColor: Colors.primary + '20',
      borderColor: Colors.primary,
    },
    tagEmoji: { fontSize: 14 },
    tagLabel: { fontSize: 13, color: Colors.textSecondary },
    tagLabelSelected: { color: Colors.text, fontWeight: '600' as const },
  });
