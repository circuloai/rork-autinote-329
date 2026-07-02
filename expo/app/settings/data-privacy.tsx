import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Download, Trash2, Shield, Lock, FileText, Share2, Info } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';

export default function DataPrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logs, preferences, profile, activeChildLogs } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const allData = {
        exportedAt: new Date().toISOString(),
        profile: profile ? {
          name: profile.caregiverName,
          email: profile.caregiverEmail,
          phone: profile.caregiverPhone,
          role: profile.role,
        } : null,
        children: profile?.children || [],
        logs: activeChildLogs || [],
        totalEntries: logs.length,
      };
      const json = JSON.stringify(allData, null, 2);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(`data:text/json;charset=utf-8,${encodeURIComponent(json)}`, {
          mimeType: 'application/json',
          dialogTitle: 'Export AutiNote Data',
          UTI: 'public.json',
        });
      } else {
        Alert.alert(
          'Export Ready',
          `${logs.length} log entries across ${profile?.children?.length || 0} child profile(s).\n\nSharing is not available on this platform.`
        );
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
                <ScaledText style={styles.rowDesc}>Autumn conversations stay on your device. AI processing happens through secure API calls.</ScaledText>
              </View>
            </View>
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
