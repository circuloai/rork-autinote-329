import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Download, Trash2, Shield, Lock, FileText, Share2, Info } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export default function DataPrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logs, preferences, profile, savePreferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const allData = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        profile: profile ? {
          name: profile.caregiverName,
          email: profile.caregiverEmail,
          phone: profile.caregiverPhone,
          role: profile.role,
        } : null,
        children: (profile?.children || []).map(child => ({
          id: child.id,
          name: child.name,
          age: child.age,
          diagnosis: child.diagnosis,
          avatar: child.avatar,
        })),
        logs: (logs || []).map(log => ({
          id: log.id,
          childId: log.childId,
          date: log.date,
          type: log.type,
          moodRating: (log as any).moodRating,
          behaviors: (log as any).behaviors,
          triggers: (log as any).triggers,
          notes: (log as any).notes,
          duration: (log as any).duration,
          intensity: (log as any).intensity,
          strategies: (log as any).strategies,
          createdAt: (log as any).createdAt,
        })),
        totalEntries: logs.length,
        totalChildren: profile?.children?.length || 0,
      };

      const json = JSON.stringify(allData, null, 2);
      const filename = `autinote-export-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, json, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export AutiNote Data',
            UTI: 'public.json',
          });
        } else {
          Alert.alert(
            'Export Ready',
            `${logs.length} log entries across ${profile?.children?.length || 0} child profile(s) exported.`
          );
        }
      }
    } catch {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your logs, child profiles, and preferences. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              if (profile?.id && supabase) {
                await supabase.from('log_entries').delete().in('child_id', profile.children.map(c => c.id));
                await supabase.from('children').delete().eq('profile_id', profile.id);
                await supabase.from('preferences').delete().eq('user_id', profile.id);
              }
              Alert.alert('Data Deleted', 'All your data has been permanently removed.');
              router.back();
            } catch {
              Alert.alert('Error', 'Could not complete deletion. Please try again.');
            }
          },
        },
      ]
    );
  };

  const withdrawAutumnConsent = () => {
    if (!preferences) return;
    Alert.alert(
      'Turn off Autumn',
      'Autumn will no longer send messages or selected context for AI responses. Your on-device chat history will remain unless you clear it from Autumn.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn Off',
          style: 'destructive',
          onPress: () => savePreferences({
            ...preferences,
            aiPreferences: {
              ...preferences.aiPreferences,
              consentStatus: 'denied',
              personalizationEnabled: false,
            },
          }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Data & Privacy</ScaledText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>YOUR DATA</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <TouchableOpacity style={styles.row} onPress={handleExportData} activeOpacity={0.7}>
              <Download size={20} color={Colors.primary} />
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowLabel}>{exporting ? 'Exporting...' : 'Export All Data'}</ScaledText>
                <ScaledText style={styles.rowDesc}>Download your logs and profiles as a JSON file</ScaledText>
              </View>
            </TouchableOpacity>
            <View style={styles.rowBorder} />
            <View style={styles.row}>
              <FileText size={20} color={Colors.textSecondary} />
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowLabel}>Total entries</ScaledText>
                <ScaledText style={styles.rowDesc}>{logs.length} log entries across {profile?.children?.length || 0} child profile{profile?.children?.length !== 1 ? 's' : ''}</ScaledText>
              </View>
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>PRIVACY</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.row}>
              <Shield size={20} color={Colors.success} />
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowLabel}>Data Storage</ScaledText>
                <ScaledText style={styles.rowDesc}>Your data is stored securely in Supabase with row-level security. Only you can access your data.</ScaledText>
              </View>
            </View>
            <View style={styles.rowBorder} />
            <View style={styles.row}>
              <Lock size={20} color={Colors.success} />
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowLabel}>AI Chat Privacy</ScaledText>
                  <ScaledText style={styles.rowDesc}>When you choose to use Autumn, your message and limited relevant context are securely sent to OpenAI to generate a response. Names, schools, photos, therapist notes, full journal entries, and Autumn chat history are not sent. Autumn history stays on this device.</ScaledText>
              </View>
            </View>
            <View style={styles.rowBorder} />
              <TouchableOpacity style={styles.row} onPress={withdrawAutumnConsent} activeOpacity={0.7}>
                <Lock size={20} color={preferences?.aiPreferences?.consentStatus === 'granted' ? Colors.error : Colors.textSecondary} />
                <View style={styles.rowContent}>
                  <ScaledText style={styles.rowLabel}>
                    {preferences?.aiPreferences?.consentStatus === 'granted' ? 'Turn off Autumn AI' : 'Autumn AI is off'}
                  </ScaledText>
                  <ScaledText style={styles.rowDesc}>
                    {preferences?.aiPreferences?.consentStatus === 'granted'
                      ? 'Withdraw permission for AI responses and selected context.'
                      : 'You can choose to enable Autumn again from its chat screen.'}
                  </ScaledText>
                </View>
              </TouchableOpacity>
              <View style={styles.rowBorder} />
            <View style={styles.row}>
              <Share2 size={20} color={Colors.success} />
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowLabel}>Shared Access</ScaledText>
                <ScaledText style={styles.rowDesc}>You control exactly what therapists can see. Permissions are managed from Shared Access settings.</ScaledText>
              </View>
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>DANGER ZONE</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <TouchableOpacity style={styles.row} onPress={handleDeleteAllData} activeOpacity={0.7}>
              <Trash2 size={20} color={Colors.error} />
              <View style={styles.rowContent}>
                <ScaledText style={[styles.rowLabel, { color: Colors.error }]}>Delete All Data</ScaledText>
                <ScaledText style={styles.rowDesc}>Permanently removes all logs, profiles, and preferences</ScaledText>
              </View>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>ABOUT</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.row}>
              <Info size={20} color={Colors.textSecondary} />
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowLabel}>AutiNote v1.0.0</ScaledText>
                <ScaledText style={styles.rowDesc}>Running on {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}</ScaledText>
              </View>
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
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.text, marginBottom: 2 },
    rowDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  });
