import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronDown, Users } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import type { AnyLogEntry, DailyLogEntry, MeltdownLogEntry, LogEntry, MoodRating } from '@/types';

const ACTIVE_CLIENT_KEY = '@autinote_therapist_active_client';

export default function TherapistInsightsTab() {
  const insets = useSafeAreaInsets();
  const { therapistClients, logs, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(ACTIVE_CLIENT_KEY);
      if (stored) setActiveClientId(stored);
    })();
  }, []);

  useEffect(() => {
    if (!activeClientId && therapistClients.length > 0) {
      setActiveClientId(therapistClients[0].child.id);
      return;
    }
    if (activeClientId && !therapistClients.some((c) => c.child.id === activeClientId)) {
      setActiveClientId(therapistClients[0]?.child.id ?? null);
    }
  }, [therapistClients, activeClientId]);

  const handleSelectClient = (childId: string) => {
    setActiveClientId(childId);
    setPickerOpen(false);
    void AsyncStorage.setItem(ACTIVE_CLIENT_KEY, childId);
  };

  const activeClient = useMemo(
    () => therapistClients.find((c) => c.child.id === activeClientId) ?? therapistClients[0],
    [therapistClients, activeClientId]
  );

  const childLogs = useMemo(() => {
    if (!activeClient) return [];
    return logs.filter((l) => l.childId === activeClient.child.id);
  }, [logs, activeClient]);

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

  const getTriggerLabel = (trigger: string) =>
    trigger.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  if (therapistClients.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Users size={36} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No clients yet</Text>
          <Text style={styles.emptyText}>
            Once a caregiver shares a child with you, their insights will appear here.
          </Text>
        </View>
      </View>
    );
  }

  const canView =
    activeClient?.permissions.canViewProgress || activeClient?.permissions.canViewLogs;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>Last 30 Days</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.pickerButton}
          activeOpacity={0.85}
          onPress={() => setPickerOpen((v) => !v)}
          testID="therapist-insights-client-picker"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerLabel}>Active client</Text>
            <Text style={styles.pickerValue} numberOfLines={1}>
              {activeClient?.child.name ?? 'Select a client'}
              {activeClient ? ` · Age ${activeClient.child.age}` : ''}
            </Text>
          </View>
          <ChevronDown
            size={20}
            color={Colors.textSecondary}
            style={pickerOpen ? styles.chevronOpen : undefined}
          />
        </TouchableOpacity>

        {pickerOpen && (
          <View style={styles.pickerList}>
            {therapistClients.map((c) => (
              <TouchableOpacity
                key={c.child.id}
                style={[
                  styles.pickerItem,
                  c.child.id === activeClient?.child.id && styles.pickerItemSelected,
                ]}
                onPress={() => handleSelectClient(c.child.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerItemText}>
                  {c.child.name} · Age {c.child.age}
                </Text>
                <Text style={styles.pickerItemSub}>{c.parentName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!canView ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Caregiver hasn&apos;t shared progress data with you for this client.
            </Text>
          </View>
        ) : (
          <>
            <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
              <Text style={styles.cardTitle}>😊 Mood Distribution</Text>
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
                  <Text style={styles.inlineStatText}>
                    Good {Math.round((moodCounts.good / totalLogs) * 100)}% · Mixed{' '}
                    {Math.round((moodCounts.mixed / totalLogs) * 100)}% · Tough{' '}
                    {Math.round((moodCounts.challenging / totalLogs) * 100)}%
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyText}>No daily logs yet.</Text>
              )}
            </GlassCard>

            {moodTags.length > 0 && (
              <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
                <Text style={styles.cardTitle}>🏆 Most Common Moods</Text>
                {moodTags.map(([tag, count], index) => (
                  <View key={tag} style={styles.tagItem}>
                    <View style={styles.tagInfo}>
                      <Text style={styles.tagRank}>#{index + 1}</Text>
                      <Text style={styles.tagName}>
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.tagCount}>{count} times</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {meltdownStats.total > 0 && (
              <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
                <Text style={styles.cardTitle}>⚠️ Meltdown Analysis</Text>
                <View style={styles.meltdownGrid}>
                  <View style={styles.meltdownStat}>
                    <Text style={styles.meltdownValue}>{meltdownStats.total}</Text>
                    <Text style={styles.meltdownLabel}>Total Events</Text>
                  </View>
                  <View style={styles.meltdownStat}>
                    <Text style={styles.meltdownValue}>{meltdownStats.avgDuration}m</Text>
                    <Text style={styles.meltdownLabel}>Avg Duration</Text>
                  </View>
                </View>

                {meltdownStats.topTriggers.length > 0 && (
                  <>
                    <Text style={styles.subSectionTitle}>Top Triggers</Text>
                    {meltdownStats.topTriggers.map(({ trigger, count }, idx) => (
                      <View key={trigger} style={styles.triggerItem}>
                        <View style={styles.triggerInfo}>
                          <Text style={styles.triggerRank}>#{idx + 1}</Text>
                          <Text style={styles.triggerName}>{getTriggerLabel(trigger)}</Text>
                        </View>
                        <Text style={styles.triggerCount}>{count}x</Text>
                      </View>
                    ))}
                  </>
                )}
              </GlassCard>
            )}

            {activeClient?.child.commonTriggers && activeClient.child.commonTriggers.length > 0 && (
              <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
                <Text style={styles.cardTitle}>🎯 Trigger Mentions</Text>
                <Text style={styles.helperText}>How often known triggers appear in logs</Text>
                {activeClient.child.commonTriggers.slice(0, 5).map((trigger: string, idx: number) => {
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
                      <Text style={styles.tagName}>{trigger}</Text>
                      <Text style={styles.tagCount}>
                        {mentionCount} {mentionCount === 1 ? 'time' : 'times'}
                      </Text>
                    </View>
                  );
                })}
              </GlassCard>
            )}

            <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
              <Text style={styles.cardTitle}>📈 Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Entries</Text>
                <Text style={styles.summaryValue}>{childLogs.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Meltdowns</Text>
                <Text style={styles.summaryValue}>{meltdownLogs.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>This Month</Text>
                <Text style={styles.summaryValue}>
                  {childLogs.filter((log) => {
                    const d = new Date(log.date);
                    const now = new Date();
                    return (
                      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                    );
                  }).length}
                </Text>
              </View>
            </GlassCard>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 32, fontWeight: '700' as const, color: Colors.text },
    subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
    content: { flex: 1, paddingHorizontal: 20 },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      marginTop: 4,
      marginBottom: 16,
      gap: 12,
    },
    chevronOpen: { transform: [{ rotate: '180deg' }] },
    pickerLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: Colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    pickerValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: Colors.text,
    },
    pickerList: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 16,
      overflow: 'hidden',
    },
    pickerItem: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    pickerItemSelected: {
      backgroundColor: Colors.primary + '14',
    },
    pickerItemText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: Colors.text,
    },
    pickerItemSub: {
      fontSize: 12,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text, marginBottom: 16 },
    progressBar: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressSegment: { height: '100%' },
    inlineStatText: {
      fontSize: 13,
      color: Colors.textSecondary,
      fontWeight: '500' as const,
      textAlign: 'center',
    },
    subSectionTitle: {
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
    meltdownStat: {
      flex: 1,
      backgroundColor: Colors.background,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    meltdownValue: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: Colors.primary,
      marginBottom: 4,
    },
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
    helperText: {
      fontSize: 13,
      color: Colors.textSecondary,
      marginBottom: 8,
      fontStyle: 'italic' as const,
    },
    summaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    summaryLabel: { fontSize: 16, color: Colors.text },
    summaryValue: { fontSize: 20, fontWeight: '600' as const, color: Colors.text },
  });
