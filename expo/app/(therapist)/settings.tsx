import { useRouter } from 'expo-router';
import { ChevronRight, User, Palette, Info, LogOut, Shield } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function TherapistSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, preferences, logout, therapistClients } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout(() => router.replace('/' as any));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <User size={28} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.caregiverName || 'Therapist'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile?.caregiverEmail || ''}
            </Text>
            <View style={styles.roleBadge}>
              <Shield size={11} color={Colors.primary} />
              <Text style={styles.roleBadgeText}>Therapist</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{therapistClients.length}</Text>
            <Text style={styles.statLabel}>Active Clients</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/customization' as any)}
            >
              <View style={styles.rowIcon}>
                <Palette size={20} color={Colors.text} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Appearance</Text>
                <Text style={styles.rowSubtitle}>Theme, color, font size</Text>
              </View>
              <ChevronRight size={18} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  'About AutiNote for Therapists',
                  'Securely view shared logs, write session notes, and message caregivers — all in one place.\n\nAll data is protected by row-level security: you only see children that caregivers have explicitly shared with you.'
                )
              }
            >
              <View style={styles.rowIcon}>
                <Info size={20} color={Colors.text} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>About</Text>
                <Text style={styles.rowSubtitle}>Privacy & app info</Text>
              </View>
              <ChevronRight size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 32, fontWeight: '700' as const, color: Colors.text },
    content: { flex: 1, paddingHorizontal: 20 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: Colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    profileAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileName: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
    profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: Colors.primary + '14',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginTop: 6,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: Colors.primary,
    },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    statBox: {
      flex: 1,
      backgroundColor: Colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    statValue: { fontSize: 28, fontWeight: '700' as const, color: Colors.text },
    statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' as const },
    section: { marginTop: 28 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: Colors.textSecondary,
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowContent: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
    rowSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      padding: 16,
      backgroundColor: Colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.error + '60',
    },
    logoutText: { fontSize: 16, fontWeight: '600' as const, color: Colors.error },
  });
