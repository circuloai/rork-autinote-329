import React, { useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, TrendingUp, BarChart3, Activity, LineChart } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';

type TimeRange = 'week' | 'month' | '3months';
type ChartType = 'mood' | 'sleep' | 'meltdowns' | 'behaviors';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  week: 'This Week',
  month: 'This Month',
  '3months': '3 Months',
};

const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'mood', label: 'Mood Trends', icon: <Activity size={20} color="#10B981" /> },
  { value: 'sleep', label: 'Sleep Patterns', icon: <BarChart3 size={20} color="#3B82F6" /> },
  { value: 'meltdowns', label: 'Meltdown Logs', icon: <Activity size={20} color="#EF4444" /> },
  { value: 'behaviors', label: 'Behavior Analysis', icon: <LineChart size={20} color="#F59E0B" /> },
];

export default function ProgressSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, savePreferencesAsync } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [timeRange, setTimeRange] = useState<TimeRange>(
    preferences?.progressTimeRange || 'month'
  );
  const [showCharts, setShowCharts] = useState<ChartType[]>(
    preferences?.progressCharts || ['mood', 'sleep', 'meltdowns', 'behaviors']
  );
  const [showTrends, setShowTrends] = useState<boolean>(
    preferences?.progressShowTrends !== false
  );
  const [showGoals, setShowGoals] = useState<boolean>(
    preferences?.progressShowGoals !== false
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleChart = (chart: ChartType) => {
    setShowCharts((prev) =>
      prev.includes(chart) ? prev.filter((c) => c !== chart) : [...prev, chart]
    );
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      await savePreferencesAsync({
        ...preferences,
        progressTimeRange: timeRange,
        progressCharts: showCharts,
        progressShowTrends: showTrends,
        progressShowGoals: showGoals,
      });
      Alert.alert('Saved', 'Progress settings updated.');
    } catch (error: any) {
      Alert.alert('Could not save progress settings', error?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Progress Settings</ScaledText>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isSaving}>
          <ScaledText style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save'}</ScaledText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>DEFAULT TIME RANGE</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.optionsRow}>
              {(['week', 'month', '3months'] as TimeRange[]).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.optionChip,
                    timeRange === range && styles.optionChipSelected,
                  ]}
                  onPress={() => setTimeRange(range)}
                  activeOpacity={0.7}
                >
                  <ScaledText
                    style={[
                      styles.optionChipText,
                      timeRange === range && styles.optionChipTextSelected,
                    ]}
                  >
                    {TIME_RANGE_LABELS[range]}
                  </ScaledText>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>SHOWN CHARTS</ScaledText>
          <ScaledText style={styles.sectionSubtitle}>Select which charts appear on the Insights tab</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            {CHART_OPTIONS.map((chart, idx, arr) => (
              <View
                key={chart.value}
                style={[styles.row, idx !== arr.length - 1 && styles.rowBorder]}
              >
                <View style={styles.rowLeft}>
                  {chart.icon}
                  <ScaledText style={styles.rowLabel}>{chart.label}</ScaledText>
                </View>
                <Switch
                  value={showCharts.includes(chart.value)}
                  onValueChange={() => toggleChart(chart.value)}
                  trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                  thumbColor={showCharts.includes(chart.value) ? Colors.primary : Colors.textLight}
                />
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>DISPLAY OPTIONS</ScaledText>
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <TrendingUp size={20} color={Colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <ScaledText style={styles.rowLabel}>Show trend lines</ScaledText>
                  <ScaledText style={styles.rowDesc}>Display moving average on mood and sleep charts</ScaledText>
                </View>
              </View>
              <Switch
                value={showTrends}
                onValueChange={setShowTrends}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={showTrends ? Colors.primary : Colors.textLight}
              />
            </View>
            <View style={styles.rowBorder} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Activity size={20} color={Colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <ScaledText style={styles.rowLabel}>Show goals & milestones</ScaledText>
                  <ScaledText style={styles.rowDesc}>Highlight therapy goals and progress markers</ScaledText>
                </View>
              </View>
              <Switch
                value={showGoals}
                onValueChange={setShowGoals}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={showGoals ? Colors.primary : Colors.textLight}
              />
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
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.textSecondary,
      marginBottom: 12,
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
    optionsRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 16,
    },
    optionChip: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: Colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    optionChipSelected: {
      backgroundColor: Colors.primary + '20',
      borderColor: Colors.primary,
    },
    optionChipText: { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
    optionChipTextSelected: { color: Colors.text, fontWeight: '600' as const },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    rowLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.text, marginLeft: 12 },
    rowDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  });
