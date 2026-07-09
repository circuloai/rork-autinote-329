import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, MessageCircle, Plus, Calendar as CalendarIcon, FileText, AlertTriangle, Heart, User as UserIcon, TrendingUp } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { getAvatarById } from '@/constants/avatars';
import type { DailyLogEntry, MeltdownLogEntry } from '@/types';

export default function TherapistClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { therapistClients, logs, therapistNotes, preferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const client = useMemo(
    () => therapistClients.find((c) => c.child.id === childId),
    [therapistClients, childId]
  );

  const childLogs = useMemo(() => {
    return logs
      .filter((l) => l.childId === childId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, childId]);

  const childNotes = useMemo(() => {
    return therapistNotes
      .filter((n) => n.childId === childId)
      .sort(
        (a, b) =>
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );
  }, [therapistNotes, childId]);

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <ScaledText style={styles.headerTitle}>Client</ScaledText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <ScaledText style={styles.emptyText}>Client not found or not shared with you.</ScaledText>
        </View>
      </View>
    );
  }

  const { child, parentName, sharedAccessId, permissions } = client;
  const avatar = getAvatarById(child.avatar);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderLog = (log: DailyLogEntry | MeltdownLogEntry | typeof childLogs[number]) => {
    if (log.type === 'daily') {
      const d = log as DailyLogEntry;
      const moodIcon =
        d.overallRating === 'great' ? '😊' : d.overallRating === 'mixed' ? '😐' : '😔';
      return (
        <View key={d.id} style={styles.logItem}>
          <ScaledText style={styles.logEmoji}>{moodIcon}</ScaledText>
          <View style={{ flex: 1 }}>
            <View style={styles.logTopRow}>
              <ScaledText style={styles.logTitle}>Daily check-in</ScaledText>
              <ScaledText style={styles.logDate}>{formatDate(d.date)}</ScaledText>
            </View>
            {d.whatWentWell ? (
              <ScaledText style={styles.logBody} numberOfLines={2}>
                + {d.whatWentWell}
              </ScaledText>
            ) : null}
            {d.whatWasChallenging ? (
              <ScaledText style={styles.logBody} numberOfLines={2}>
                – {d.whatWasChallenging}
              </ScaledText>
            ) : null}
          </View>
        </View>
      );
    }
    if (log.type === 'meltdown') {
      const m = log as MeltdownLogEntry;
      return (
        <View key={m.id} style={styles.logItem}>
          <ScaledText style={styles.logEmoji}>🌊</ScaledText>
          <View style={{ flex: 1 }}>
            <View style={styles.logTopRow}>
              <ScaledText style={styles.logTitle}>Meltdown · {m.severity}</ScaledText>
              <ScaledText style={styles.logDate}>{formatDate(m.date)}</ScaledText>
            </View>
            <ScaledText style={styles.logBody} numberOfLines={2}>
              {m.durationMinutes ? `${m.durationMinutes} min` : ''}
              {m.triggers && m.triggers.length > 0
                ? ` · ${m.triggers.join(', ')}`
                : ''}
            </ScaledText>
            {m.additionalNotes ? (
              <ScaledText style={styles.logBody} numberOfLines={2}>
                {m.additionalNotes}
              </ScaledText>
            ) : null}
          </View>
        </View>
      );
    }
    return (
      <View key={log.id} style={styles.logItem}>
        <ScaledText style={styles.logEmoji}>📝</ScaledText>
        <View style={{ flex: 1 }}>
          <View style={styles.logTopRow}>
            <ScaledText style={styles.logTitle}>Log</ScaledText>
            <ScaledText style={styles.logDate}>{formatDate(log.date)}</ScaledText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle} numberOfLines={1}>
          {child.name}
        </ScaledText>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.push(`/therapist-chat?sharedAccessId=${sharedAccessId}` as any)
          }
        >
          <MessageCircle size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View
            style={[
              styles.heroAvatar,
              { backgroundColor: avatar?.bg || Colors.primary + '22' },
            ]}
          >
            {avatar ? (
              <Image source={{ uri: avatar.url }} style={styles.heroAvatarImage} />
            ) : (
              <ScaledText style={[styles.heroAvatarLetter, { color: Colors.primary }]}>
                {child.name.charAt(0).toUpperCase()}
              </ScaledText>
            )}
          </View>
          <ScaledText style={styles.heroName}>{child.name}</ScaledText>
          <ScaledText style={styles.heroMeta}>
            Age {child.age}
            {child.gradeLevel ? ` · Grade ${child.gradeLevel}` : ''}
          </ScaledText>
          <View style={styles.caregiverChip}>
            <UserIcon size={12} color={Colors.primary} />
            <ScaledText style={styles.caregiverText}>Caregiver: {parentName}</ScaledText>
          </View>

          <View style={styles.heroChips}>
            {child.diagnosis ? (
              <View style={[styles.chip, { backgroundColor: Colors.primary + '18' }]}>
                <Heart size={12} color={Colors.primary} />
                <ScaledText style={styles.chipText}>{child.diagnosis}</ScaledText>
              </View>
            ) : null}
            {(child.commonTriggers || []).slice(0, 3).map((t: string, i: number) => (
              <View
                key={i}
                style={[styles.chip, { backgroundColor: Colors.warning + '22' }]}
              >
                <AlertTriangle size={12} color={Colors.warning} />
                <ScaledText style={styles.chipText}>{t}</ScaledText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsRow}>
          {permissions.canAddNotes && !permissions.readonlyMode ? (
            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.85}
              onPress={() =>
                router.push(`/therapist/note/${child.id}` as any)
              }
              testID="add-note-cta"
            >
              <Plus size={18} color={Colors.surface} />
              <ScaledText style={styles.primaryActionText}>Add session note</ScaledText>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.secondaryAction}
            activeOpacity={0.85}
            onPress={() =>
              router.push(`/therapist-chat?sharedAccessId=${sharedAccessId}` as any)
            }
          >
            <MessageCircle size={18} color={Colors.primary} />
            <ScaledText style={styles.secondaryActionText}>Message caregiver</ScaledText>
          </TouchableOpacity>
        </View>

        {(permissions.canViewProgress || permissions.canViewLogs) && (
          <TouchableOpacity
            style={styles.insightsAction}
            activeOpacity={0.85}
            onPress={() => router.push(`/therapist/insights/${child.id}` as any)}
            testID="therapist-insights-cta"
          >
            <TrendingUp size={18} color={Colors.surface} />
            <ScaledText style={styles.insightsActionText}>View Insights</ScaledText>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={16} color={Colors.text} />
            <ScaledText style={styles.sectionTitle}>Recent logs</ScaledText>
            <ScaledText style={styles.sectionCount}>{childLogs.length}</ScaledText>
          </View>
          <View style={styles.card}>
            {!permissions.canViewLogs ? (
              <ScaledText style={styles.placeholder}>
                Caregiver hasn&apos;t shared logs with you.
              </ScaledText>
            ) : childLogs.length === 0 ? (
              <ScaledText style={styles.placeholder}>No logs yet.</ScaledText>
            ) : (
              childLogs.slice(0, 8).map(renderLog)
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color={Colors.text} />
            <ScaledText style={styles.sectionTitle}>Session notes</ScaledText>
            <ScaledText style={styles.sectionCount}>{childNotes.length}</ScaledText>
          </View>
          <View style={styles.card}>
            {childNotes.length === 0 ? (
              <ScaledText style={styles.placeholder}>
                No notes yet. Tap &quot;Add session note&quot; to write your first one.
              </ScaledText>
            ) : (
              childNotes.map((n) => (
                <View key={n.id} style={styles.noteItem}>
                  <View style={styles.logTopRow}>
                    <ScaledText style={styles.noteDate}>{formatDate(n.sessionDate)}</ScaledText>
                  </View>
                  {n.goalsWorkedOn ? (
                    <View style={styles.noteField}>
                      <ScaledText style={styles.noteFieldLabel}>Goals</ScaledText>
                      <ScaledText style={styles.noteFieldText}>{n.goalsWorkedOn}</ScaledText>
                    </View>
                  ) : null}
                  {n.behaviorsObserved ? (
                    <View style={styles.noteField}>
                      <ScaledText style={styles.noteFieldLabel}>Behaviors</ScaledText>
                      <ScaledText style={styles.noteFieldText}>{n.behaviorsObserved}</ScaledText>
                    </View>
                  ) : null}
                  {n.recommendations ? (
                    <View style={styles.noteField}>
                      <ScaledText style={styles.noteFieldLabel}>Recommendations</ScaledText>
                      <ScaledText style={styles.noteFieldText}>{n.recommendations}</ScaledText>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 60 }} />
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
      paddingBottom: 12,
      backgroundColor: Colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700' as const,
      color: Colors.text,
      marginHorizontal: 12,
    },
    content: { flex: 1 },
    contentContainer: { paddingHorizontal: 20, paddingTop: 8 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { color: Colors.textSecondary, fontSize: 15 },
    heroCard: {
      backgroundColor: Colors.surface,
      borderRadius: 22,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    heroAvatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginBottom: 12,
    },
    heroAvatarImage: { width: '100%', height: '100%' },
    heroAvatarLetter: { fontSize: 32, fontWeight: '700' as const },
    heroName: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: Colors.text,
    },
    heroMeta: {
      fontSize: 13,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    caregiverChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: Colors.primary + '14',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 10,
    },
    caregiverText: {
      fontSize: 12,
      color: Colors.primary,
      fontWeight: '600' as const,
    },
    heroChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      justifyContent: 'center',
      marginTop: 14,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    chipText: { fontSize: 12, color: Colors.text, fontWeight: '600' as const },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    primaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: Colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
    },
    primaryActionText: {
      color: Colors.surface,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    secondaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: Colors.primary + '15',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.primary + '40',
    },
    secondaryActionText: {
      color: Colors.primary,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    insightsAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: Colors.secondary,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 10,
    },
    insightsActionText: {
      color: Colors.surface,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    section: { marginTop: 24 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: Colors.text,
      flex: 1,
    },
    sectionCount: {
      fontSize: 12,
      color: Colors.textSecondary,
      backgroundColor: Colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      fontWeight: '600' as const,
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
    },
    placeholder: {
      padding: 18,
      color: Colors.textSecondary,
      fontSize: 14,
      fontStyle: 'italic' as const,
    },
    logItem: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    logEmoji: { fontSize: 22 },
    logTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    logTitle: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: Colors.text,
      flex: 1,
    },
    logDate: { fontSize: 12, color: Colors.textSecondary },
    logBody: {
      fontSize: 13,
      color: Colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    noteItem: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
      gap: 6,
    },
    noteDate: {
      fontSize: 13,
      color: Colors.primary,
      fontWeight: '700' as const,
    },
    noteField: { gap: 2 },
    noteFieldLabel: {
      fontSize: 11,
      color: Colors.textSecondary,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    noteFieldText: { fontSize: 14, color: Colors.text, lineHeight: 19 },
  });
