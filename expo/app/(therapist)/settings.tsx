import { useRouter } from 'expo-router';
import { ChevronRight, User, Palette, Info, LogOut, Shield, Pencil } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';

export default function TherapistSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, preferences, logout, therapistClients } = useApp();
  const Colors = useColors(preferences);
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
        <ScaledText style={styles.title}>Settings</ScaledText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/settings/profile' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.profileAvatar}>
            <User size={28} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ScaledText style={styles.profileName} numberOfLines={1}>
              {profile?.caregiverName || 'Therapist'}
            </ScaledText>
            <ScaledText style={styles.profileEmail} numberOfLines={1}>
              {profile?.caregiverEmail || ''}
            </ScaledText>
            <View style={styles.roleBadge}>
              <Shield size={11} color={Colors.primary} />
              <ScaledText style={styles.roleBadgeText}>Therapist</ScaledText>
            </View>
          </View>
          <Pencil size={16} color={Colors.textLight} />
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ScaledText style={styles.statValue}>{therapistClients.length}</ScaledText>
            <ScaledText style={styles.statLabel}>Active Clients</ScaledText>
          </View>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>ACCOUNT</ScaledText>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => router.push('/settings/profile' as any)}
            >
              <View style={styles.rowIcon}>
                <User size={20} color={Colors.text} />
              </View>
              <View style={styles.rowContent}>
                <ScaledText style={styles.rowTitle}>My Profile</ScaledText>
                <ScaledText style={styles.rowSubtitle}>Name, email, phone, password</ScaledText>
              </View>
              <ChevronRight size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>PREFERENCES</ScaledText>
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
                <ScaledText style={styles.rowTitle}>Appearance</ScaledText>
                <ScaledText style={styles.rowSubtitle}>Theme, color, font size</ScaledText>
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
                <ScaledText style={styles.rowTitle}>About</ScaledText>
                <ScaledText style={styles.rowSubtitle}>Privacy & app info</ScaledText>
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
          <ScaledText style={styles.logoutText}>Log Out</ScaledText>
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
