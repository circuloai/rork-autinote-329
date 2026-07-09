import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Shield, Eye, FileText, MessageSquare, Lock, Download, Calendar, ClipboardList } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState, useEffect } from 'react';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import type { SharedAccess } from '@/types';

type ToggleKey =
  | 'canViewLogs'
  | 'canViewProgress'
  | 'canViewProfile'
  | 'canAddNotes'
  | 'canAddSessions'
  | 'canComment'
  | 'canExport'
  | 'readonlyMode';

interface PermRow {
  key: ToggleKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export default function ManagePermissionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sharedAccess, preferences, saveSharedAccess } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const access = useMemo(
    () => sharedAccess.find((sa) => sa.id === id),
    [sharedAccess, id]
  );

  const [draft, setDraft] = useState<SharedAccess | null>(access ?? null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (access && !draft) setDraft(access);
  }, [access, draft]);

  const rows: PermRow[] = useMemo(
    () => [
      {
        key: 'canViewLogs',
        label: 'View daily & meltdown logs',
        description: 'See detailed entries the caregiver records.',
        icon: <ClipboardList size={20} color={Colors.primary} />,
      },
      {
        key: 'canViewProgress',
        label: 'View progress & insights',
        description: 'Access trends, charts, and AI insights.',
        icon: <Eye size={20} color={Colors.primary} />,
      },
      {
        key: 'canViewProfile',
        label: 'View child profile',
        description: 'Diagnosis, triggers, strengths, and interests.',
        icon: <Shield size={20} color={Colors.primary} />,
      },
      {
        key: 'canAddNotes',
        label: 'Add session notes',
        description: 'Create professional notes scoped to this child.',
        icon: <FileText size={20} color={Colors.primary} />,
      },
      {
        key: 'canAddSessions',
        label: 'Schedule sessions',
        description: 'Add events to the shared calendar.',
        icon: <Calendar size={20} color={Colors.primary} />,
      },
      {
        key: 'canComment',
        label: 'Comment on logs',
        description: 'Reply to caregiver entries to collaborate.',
        icon: <MessageSquare size={20} color={Colors.primary} />,
      },
      {
        key: 'canExport',
        label: 'Export data',
        description: 'Download reports and PDFs.',
        icon: <Download size={20} color={Colors.primary} />,
      },
      {
        key: 'readonlyMode',
        label: 'Read-only mode',
        description: 'Prevents this therapist from making any changes.',
        icon: <Lock size={20} color={Colors.warning} />,
      },
    ],
    [Colors]
  );

  if (!access || !draft) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <ScaledText style={styles.headerTitle}>Permissions</ScaledText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ScaledText style={styles.emptyText}>This invitation no longer exists.</ScaledText>
        </View>
      </View>
    );
  }

  const dirty = rows.some((r) => draft[r.key] !== access[r.key]);

  const toggle = (key: ToggleKey, value: boolean) => {
    setDraft({ ...draft, [key]: value });
  };

  const handleSave = () => {
    if (!draft) return;
    setSaving(true);
    saveSharedAccess(draft);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Saved', 'Permissions updated.');
      router.back();
    }, 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Permissions</ScaledText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.therapistCard}>
          <ScaledText style={styles.cardLabel}>Managing permissions for</ScaledText>
          <ScaledText style={styles.therapistName}>{access.therapistName}</ScaledText>
          <ScaledText style={styles.therapistMeta}>
            {access.therapistRole} · {access.therapistEmail}
          </ScaledText>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  (access.status === 'accepted'
                    ? Colors.success
                    : access.status === 'pending'
                      ? Colors.warning
                      : Colors.error) + '20',
              },
            ]}
          >
            <ScaledText
              style={[
                styles.statusText,
                {
                  color:
                    access.status === 'accepted'
                      ? Colors.success
                      : access.status === 'pending'
                        ? Colors.warning
                        : Colors.error,
                },
              ]}
            >
              {access.status}
            </ScaledText>
          </View>
        </View>

        <ScaledText style={styles.sectionTitle}>Access controls</ScaledText>
        <View style={styles.list}>
          {rows.map((row, idx) => (
            <View
              key={row.key}
              style={[styles.row, idx === rows.length - 1 && styles.rowLast]}
              testID={`perm-${row.key}`}
            >
              <View style={styles.rowIcon}>{row.icon}</View>
              <View style={styles.rowText}>
                <ScaledText style={styles.rowLabel}>{row.label}</ScaledText>
                <ScaledText style={styles.rowDescription}>{row.description}</ScaledText>
              </View>
              <Switch
                value={Boolean(draft[row.key])}
                onValueChange={(v) => toggle(row.key, v)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>
          ))}
        </View>

        <ScaledText style={styles.footnote}>
          Changes apply immediately after saving. The therapist will only see
          what these toggles allow.
        </ScaledText>

        <TouchableOpacity
          style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.7}
          testID="save-permissions"
        >
          <ScaledText style={styles.saveButtonText}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
          </ScaledText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
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
    headerTitle: { fontSize: 20, fontWeight: '600' as const, color: Colors.text },
    content: { flex: 1, paddingHorizontal: 20 },
    therapistCard: {
      backgroundColor: Colors.primary + '12',
      borderRadius: 16,
      padding: 18,
      marginTop: 16,
      borderWidth: 1,
      borderColor: Colors.primary + '30',
    },
    cardLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.4, textTransform: 'uppercase' as const },
    therapistName: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
    therapistMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    statusPill: {
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusText: { fontSize: 12, fontWeight: '700' as const, textTransform: 'capitalize' as const },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: Colors.textSecondary,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      marginTop: 24,
      marginBottom: 10,
    },
    list: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: Colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
    rowDescription: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
    footnote: {
      fontSize: 12,
      color: Colors.textSecondary,
      lineHeight: 18,
      marginTop: 14,
      paddingHorizontal: 4,
    },
    saveButton: {
      backgroundColor: Colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    saveButtonDisabled: { backgroundColor: Colors.textLight, opacity: 0.5 },
    saveButtonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.surface },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  });
