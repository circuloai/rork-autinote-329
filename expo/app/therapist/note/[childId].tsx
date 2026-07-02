import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { X, Save } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState } from 'react';
import ScaledText from '@/components/ScaledText';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { TherapistNote } from '@/types';

export default function TherapistNoteComposerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { therapistClients, profile, preferences, saveTherapistNote } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const client = useMemo(
    () => therapistClients.find((c) => c.child.id === childId),
    [therapistClients, childId]
  );

  const today = new Date().toISOString().split('T')[0];
  const [sessionDate, setSessionDate] = useState<string>(today);
  const [goalsWorkedOn, setGoalsWorkedOn] = useState<string>('');
  const [skillsPracticed, setSkillsPracticed] = useState<string>('');
  const [behaviorsObserved, setBehaviorsObserved] = useState<string>('');
  const [strategiesUsed, setStrategiesUsed] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [nextSessionGoals, setNextSessionGoals] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const isValid =
    sessionDate.trim().length > 0 &&
    (goalsWorkedOn.trim() ||
      skillsPracticed.trim() ||
      behaviorsObserved.trim() ||
      strategiesUsed.trim() ||
      recommendations.trim() ||
      nextSessionGoals.trim());

  const handleSave = () => {
    if (!client || !profile) {
      Alert.alert('Error', 'Cannot save note. Client not found.');
      return;
    }
    if (!isValid) {
      Alert.alert('Add some content', 'Please fill in at least one field.');
      return;
    }

    setSaving(true);
    const note: TherapistNote = {
      id: `tn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId: client.child.id,
      therapistId: profile.id,
      sharedAccessId: client.sharedAccessId,
      sessionDate,
      goalsWorkedOn: goalsWorkedOn.trim() || undefined,
      skillsPracticed: skillsPracticed.trim() || undefined,
      behaviorsObserved: behaviorsObserved.trim() || undefined,
      strategiesUsed: strategiesUsed.trim() || undefined,
      recommendations: recommendations.trim() || undefined,
      nextSessionGoals: nextSessionGoals.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      saveTherapistNote(note);
      console.log('[NoteComposer] Note saved:', note.id);
      setTimeout(() => {
        setSaving(false);
        router.back();
      }, 400);
    } catch (e) {
      console.error('[NoteComposer] Save error:', e);
      setSaving(false);
      Alert.alert('Error', 'Could not save note. Please try again.');
    }
  };

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <ScaledText style={styles.headerTitle}>Session Note</ScaledText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <ScaledText style={styles.emptyText}>Client not found.</ScaledText>
        </View>
      </View>
    );
  }

  if (!client.permissions.canAddNotes || client.permissions.readonlyMode) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <ScaledText style={styles.headerTitle}>Session Note</ScaledText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <ScaledText style={styles.emptyText}>
            You don&apos;t have permission to add notes for this client.
          </ScaledText>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} testID="close-note">
          <X size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ScaledText style={styles.headerEyebrow}>SESSION NOTE</ScaledText>
          <ScaledText style={styles.headerTitle} numberOfLines={1}>{client.child.name}</ScaledText>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}
          disabled={!isValid || saving}
          testID="save-note"
        >
          <Save size={18} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <ScaledText style={styles.label}>Session date</ScaledText>
          <TextInput
            style={styles.input}
            value={sessionDate}
            onChangeText={setSessionDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textLight}
            testID="session-date"
          />
        </View>

        {[
          { label: 'Goals worked on', value: goalsWorkedOn, setter: setGoalsWorkedOn, hint: 'e.g., Turn-taking, naming colors' },
          { label: 'Skills practiced', value: skillsPracticed, setter: setSkillsPracticed, hint: 'e.g., Eye contact, requesting' },
          { label: 'Behaviors observed', value: behaviorsObserved, setter: setBehaviorsObserved, hint: 'What did you notice?' },
          { label: 'Strategies used', value: strategiesUsed, setter: setStrategiesUsed, hint: 'Techniques and supports' },
          { label: 'Recommendations', value: recommendations, setter: setRecommendations, hint: 'For caregiver to follow up' },
          { label: 'Next session goals', value: nextSessionGoals, setter: setNextSessionGoals, hint: 'What to focus on next time' },
        ].map((f) => (
          <View key={f.label} style={styles.field}>
            <ScaledText style={styles.label}>{f.label}</ScaledText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={f.value}
              onChangeText={f.setter}
              placeholder={f.hint}
              placeholderTextColor={Colors.textLight}
              multiline
              textAlignVertical="top"
            />
          </View>
        ))}

        <ScaledText style={styles.disclaimer}>
          This note will be visible to {client.parentName} (caregiver of {client.child.name}).
        </ScaledText>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerEyebrow: {
      fontSize: 10,
      color: Colors.textSecondary,
      fontWeight: '700' as const,
      letterSpacing: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: Colors.text,
      marginTop: 2,
    },
    saveButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.4 },
    content: { flex: 1 },
    contentContainer: { padding: 20 },
    field: { marginBottom: 18 },
    label: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: Colors.text,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    textArea: { minHeight: 90 },
    disclaimer: {
      fontSize: 12,
      color: Colors.textSecondary,
      fontStyle: 'italic' as const,
      textAlign: 'center',
      marginTop: 8,
    },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
  });
