import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Sparkles, MessageCircle, Brain, Zap } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';

type ResponseStyle = 'warm' | 'professional' | 'brief';
type FocusArea = 'autism' | 'behavior' | 'emotional' | 'sleep' | 'sensory';
type Verbosity = 'short' | 'balanced' | 'detailed';

const STYLE_LABELS: Record<ResponseStyle, { label: string; desc: string }> = {
  warm: { label: 'Warm & Conversational', desc: 'Friendly, empathetic tone like talking to a supportive friend' },
  professional: { label: 'Professional & Clinical', desc: 'Structured, evidence-based, more formal language' },
  brief: { label: 'Brief & Direct', desc: 'Short, to-the-point answers with minimal elaboration' },
};

const FOCUS_OPTIONS: { value: FocusArea; label: string; emoji: string }[] = [
  { value: 'autism', label: 'Autism support', emoji: '🧩' },
  { value: 'behavior', label: 'Behavior intervention', emoji: '📊' },
  { value: 'emotional', label: 'Emotional regulation', emoji: '💙' },
  { value: 'sleep', label: 'Sleep guidance', emoji: '😴' },
  { value: 'sensory', label: 'Sensory processing', emoji: '🔊' },
];

const VERBOSITY_LABELS: Record<Verbosity, string> = {
  short: 'Short',
  balanced: 'Balanced',
  detailed: 'Detailed',
};

export default function AutumnSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, savePreferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(
    (preferences as any)?.autumnStyle || 'warm'
  );
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>(
    (preferences as any)?.autumnFocus || ['autism', 'behavior', 'emotional', 'sleep', 'sensory']
  );
  const [verbosity, setVerbosity] = useState<Verbosity>(
    (preferences as any)?.autumnVerbosity || 'balanced'
  );

  const toggleFocus = (area: FocusArea) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSave = () => {
    if (!preferences) return;
    savePreferences({
      ...preferences,
      ...({ autumnStyle: responseStyle } as any),
      ...({ autumnFocus: focusAreas } as any),
      ...({ autumnVerbosity: verbosity } as any),
    });
    Alert.alert('Saved', 'Autumn settings updated. New conversations will use these preferences.');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Customize Autumn</ScaledText>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <ScaledText style={styles.saveBtnText}>Save</ScaledText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={20} color={Colors.primary} />
            <ScaledText style={styles.sectionTitle}>RESPONSE STYLE</ScaledText>
          </View>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            {Object.entries(STYLE_LABELS).map(([key, { label, desc }], idx, arr) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionRow,
                  idx !== arr.length - 1 && styles.rowBorder,
                  responseStyle === key && styles.optionRowSelected,
                ]}
                onPress={() => setResponseStyle(key as ResponseStyle)}
                activeOpacity={0.7}
              >
                <View style={styles.radioOuter}>
                  {responseStyle === key && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <ScaledText style={styles.optionLabel}>{label}</ScaledText>
                  <ScaledText style={styles.optionDesc}>{desc}</ScaledText>
                </View>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Brain size={20} color={Colors.primary} />
            <ScaledText style={styles.sectionTitle}>FOCUS AREAS</ScaledText>
          </View>
          <ScaledText style={styles.sectionSubtitle}>Select topics Autumn should specialize in</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.focusWrap}>
              {FOCUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.focusChip,
                    focusAreas.includes(opt.value) && styles.focusChipSelected,
                  ]}
                  onPress={() => toggleFocus(opt.value)}
                  activeOpacity={0.7}
                >
                  <ScaledText style={styles.focusEmoji}>{opt.emoji}</ScaledText>
                  <ScaledText
                    style={[
                      styles.focusLabel,
                      focusAreas.includes(opt.value) && styles.focusLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </ScaledText>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MessageCircle size={20} color={Colors.primary} />
            <ScaledText style={styles.sectionTitle}>VERBOSITY</ScaledText>
          </View>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.optionsRow}>
              {(['short', 'balanced', 'detailed'] as Verbosity[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.verbosityChip,
                    verbosity === v && styles.verbosityChipSelected,
                  ]}
                  onPress={() => setVerbosity(v)}
                  activeOpacity={0.7}
                >
                  <ScaledText
                    style={[
                      styles.verbosityChipText,
                      verbosity === v && styles.verbosityChipTextSelected,
                    ]}
                  >
                    {VERBOSITY_LABELS[v]}
                  </ScaledText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.rowBorder, { marginHorizontal: 0 }]} />
            <View style={{ padding: 16 }}>
              <ScaledText style={styles.verbosityHint}>
                {verbosity === 'short'
                  ? '1-2 sentence responses. Quick and actionable.'
                  : verbosity === 'balanced'
                  ? '2-3 paragraphs with practical tips and context.'
                  : 'In-depth analysis with examples, strategies, and follow-up suggestions.'}
              </ScaledText>
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
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.textSecondary,
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
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      gap: 12,
    },
    optionRowSelected: {
      backgroundColor: Colors.primary + '0A',
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: Colors.primary,
    },
    optionLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text, marginBottom: 2 },
    optionDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
    focusWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 16,
    },
    focusChip: {
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
    focusChipSelected: {
      backgroundColor: Colors.primary + '20',
      borderColor: Colors.primary,
    },
    focusEmoji: { fontSize: 14 },
    focusLabel: { fontSize: 13, color: Colors.textSecondary },
    focusLabelSelected: { color: Colors.text, fontWeight: '600' as const },
    optionsRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 16,
    },
    verbosityChip: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: Colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    verbosityChipSelected: {
      backgroundColor: Colors.primary + '20',
      borderColor: Colors.primary,
    },
    verbosityChipText: { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
    verbosityChipTextSelected: { color: Colors.text, fontWeight: '600' as const },
    verbosityHint: {
      fontSize: 13,
      color: Colors.textSecondary,
      lineHeight: 20,
    },
  });
