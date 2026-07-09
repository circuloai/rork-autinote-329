import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import type { AnyLogEntry, DailyLogEntry, MeltdownLogEntry, LogEntry, MoodRating } from '@/types';

export default function TherapistInsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { therapistClients, logs, preferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const client = useMemo(
    () => therapistClients.find((c) => c.child.id === childId),
    [therapistClients, childId]
  );

  const childLogs = useMemo(() => {
    return logs.filter((l) => l.childId === childId);
  }, [logs, childId]);

  const moodCounts = useMemo(() => {
    const counts = { good: 0, mixed: 0, challenging: 0 };
    childLogs
      .filter((l) => l.type === 'daily')
      .forEach((logEntry) => {
        const log = logEntry as AnyLogEntry;
        if ('overallRating' in log) {
          const rating = (log as DailyLogEntry).overallRating;
          const mood = rating === 'great' ? 'good' : (rating as MoodRating);
          if (mood && mood in counts) counts[mood as keyof typeof counts]++;
        }
      });
    return counts;
  }, [childLogs]);

  const totalLogs = moodCounts.good + moodCounts.mixed + moodCounts.challenging;

  const moodTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    childLogs
      .filter((l) => l.type === 'daily')
      .forEach((logEntry) => {
        const log = logEntry as AnyLogEntry;
        if ('moodTags' in log && Array.isArray(log.moodTags)) {
          log.moodTags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [childLogs]);

  const meltdownLogs = useMemo(() => {
    return childLogs
      .map((log) => log as AnyLogEntry)
      .filter((log): log is MeltdownLogEntry => log.type === 'meltdown');
  }, [childLogs]);

  const meltdownStats = useMemo(() => {
    const stats = {
      total: meltdownLogs.length,
      avgDuration: 0,
      severityCounts: { mild: 0, moderate: 0, severe: 0 },
      topTriggers: [] as { trigger: string; count: number }[],
    };
    if (meltdownLogs.length === 0) return stats;
    const triggerMap: Record<string, number> = {};
    let totalDuration = 0;
    meltdownLogs.forEach((log) => {
      totalDuration += log.durationMinutes;
      stats.severityCounts[log.severity]++;
      log.triggers.forEach((t) => {
        triggerMap[t] = (triggerMap[t] || 0) + 1;
      });
    });
    stats.avgDuration = Math.round(totalDuration / meltdownLogs.length);
    stats.topTriggers = Object.entries(triggerMap)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return stats;
  }, [meltdownLogs]);

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <ScaledText style={styles.headerTitle}>Insights</ScaledText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <ScaledText style={styles.emptyText}>Client not found or not shared with you.</ScaledText>
        </View>
      </View>
    );
  }

  const canView = client.permissions.canViewProgress || client.permissions.canViewLogs;

  const getTriggerLabel = (trigger: string) =>
    trigger.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle} numberOfLines={1}>
          {client.child.name} · Insights
        </ScaledText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!canView ? (
          <View style={styles.empty}>
            <ScaledText style={styles.emptyText}>
              Caregiver hasn&apos;t shared progress data with you.
            </ScaledText>
          </View>
        ) : (
          <>
            <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
              <ScaledText style={styles.cardTitle}>😊 Mood Distribution</ScaledText>
              {totalLogs > 0 ? (
                <>
                  <View style={styles.progressBar}>
                    {moodCounts.good > 0 && (
                      <View style={[styles.progressSegment, { backgroundColor: Colors.goodDay, flex: moodCounts.good }]} />
                    )}
                    {moodCounts.mixed > 0 && (
                      <View style={[styles.progressSegment, { backgroundColor: Colors.mixedDay, flex: moodCounts.mixed }]} />
                    )}
                    {moodCounts.challenging > 0 && (
                      <View style={[styles.progressSegment, { backgroundColor: Colors.challengingDay, flex: moodCounts.challenging }]} />
                    )}
                  </View>
                  <ScaledText style={styles.inlineStatText}>
                    Good {Math.round((moodCounts.good / totalLogs) * 100)}% · Mixed {Math.round((moodCounts.mixed / totalLogs) * 100)}% · Tough {Math.round((moodCounts.challenging / totalLogs) * 100)}%
                  </ScaledText>
                </>
              ) : (
                <ScaledText style={styles.emptyText}>No daily logs yet.</ScaledText>
              )}
            </GlassCard>

            {moodTags.length > 0 && (
              <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
                <ScaledText style={styles.cardTitle}>🏆 Most Common Moods</ScaledText>
                {moodTags.map(([tag, count], index) => (
                  <View key={tag} style={styles.tagItem}>
                    <View style={styles.tagInfo}>
                      <ScaledText style={styles.tagRank}>#{index + 1}</ScaledText>
                      <ScaledText style={styles.tagName}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</ScaledText>
                    </View>
                    <ScaledText style={styles.tagCount}>{count} times</ScaledText>
                  </View>
                ))}
              </GlassCard>
            )}

            {meltdownStats.total > 0 && (
              <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
                <ScaledText style={styles.cardTitle}>⚠️ Meltdown Analysis</ScaledText>
                <View style={styles.meltdownGrid}>
                  <View style={styles.meltdownStat}>
                    <ScaledText style={styles.meltdownValue}>{meltdownStats.total}</ScaledText>
                    <ScaledText style={styles.meltdownLabel}>Total Events</ScaledText>
                  </View>
                  <View style={styles.meltdownStat}>
                    <ScaledText style={styles.meltdownValue}>{meltdownStats.avgDuration}m</ScaledText>
                    <ScaledText style={styles.meltdownLabel}>Avg Duration</ScaledText>
                  </View>
                </View>

                {meltdownStats.topTriggers.length > 0 && (
                  <>
                    <ScaledText style={styles.sectionTitle}>Top Triggers</ScaledText>
                    {meltdownStats.topTriggers.map(({ trigger, count }, idx) => (
                      <View key={trigger} style={styles.triggerItem}>
                        <View style={styles.triggerInfo}>
                          <ScaledText style={styles.triggerRank}>#{idx + 1}</ScaledText>
                          <ScaledText style={styles.triggerName}>{getTriggerLabel(trigger)}</ScaledText>
                        </View>
                        <ScaledText style={styles.triggerCount}>{count}x</ScaledText>
                      </View>
                    ))}
                  </>
                )}
              </GlassCard>
            )}

            {client.child.commonTriggers && client.child.commonTriggers.length > 0 && (
              <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
                <ScaledText style={styles.cardTitle}>🎯 Trigger Mentions</ScaledText>
                <ScaledText style={styles.helperText}>How often known triggers appear in logs</ScaledText>
                {client.child.commonTriggers.slice(0, 5).map((trigger: string, idx: number) => {
                  const mentionCount = childLogs.filter((log) => {
                    const positiveNotes =
                      log.type === 'daily'
                        ? (log as DailyLogEntry).whatWentWell || ''
                        : (log as LogEntry).positiveNotes || '';
                    const challengeNotes =
                      log.type === 'daily'
                        ? (log as DailyLogEntry).whatWasChallenging || ''
                        : log.type === 'meltdown'
                        ? (log as MeltdownLogEntry).additionalNotes || ''
                        : (log as LogEntry).challengeNotes || '';
                    const txt = `${positiveNotes} ${challengeNotes}`.toLowerCase();
                    return txt.includes(trigger.toLowerCase());
                  }).length;
                  return (
                    <View key={idx} style={styles.tagItem}>
                      <ScaledText style={styles.tagName}>{trigger}</ScaledText>
                      <ScaledText style={styles.tagCount}>
                        {mentionCount} {mentionCount === 1 ? 'time' : 'times'}
                      </ScaledText>
                    </View>
                  );
                })}
              </GlassCard>
            )}

            <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
              <ScaledText style={styles.cardTitle}>📈 Summary</ScaledText>
              <View style={styles.summaryItem}>
                <ScaledText style={styles.summaryLabel}>Total Entries</ScaledText>
                <ScaledText style={styles.summaryValue}>{childLogs.length}</ScaledText>
              </View>
              <View style={styles.summaryItem}>
                <ScaledText style={styles.summaryLabel}>Meltdowns</ScaledText>
                <ScaledText style={styles.summaryValue}>{meltdownLogs.length}</ScaledText>
              </View>
              <View style={styles.summaryItem}>
                <ScaledText style={styles.summaryLabel}>This Month</ScaledText>
                <ScaledText style={styles.summaryValue}>
                  {childLogs.filter((log) => {
                    const d = new Date(log.date);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </ScaledText>
              </View>
            </GlassCard>
          </>
        )}

        <View style={{ height: 40 }} />
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
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
    card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text, marginBottom: 16 },
    progressBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
    progressSegment: { height: '100%' },
    inlineStatText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const, textAlign: 'center' },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: Colors.text,
      marginTop: 12,
      marginBottom: 8,
    },
    tagItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    tagInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tagRank: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
    tagName: { fontSize: 15, color: Colors.text },
    tagCount: { fontSize: 14, color: Colors.textSecondary },
    meltdownGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    meltdownStat: { flex: 1, backgroundColor: Colors.background, padding: 16, borderRadius: 12, alignItems: 'center' },
    meltdownValue: { fontSize: 28, fontWeight: '700' as const, color: Colors.primary, marginBottom: 4 },
    meltdownLabel: { fontSize: 12, color: Colors.textSecondary },
    triggerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    triggerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    triggerRank: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
    triggerName: { fontSize: 14, color: Colors.text },
    triggerCount: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
    helperText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontStyle: 'italic' as const },
    summaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    summaryLabel: { fontSize: 16, color: Colors.text },
    summaryValue: { fontSize: 20, fontWeight: '600' as const, color: Colors.text },
  });
