import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { MoodRating, AnyLogEntry, DailyLogEntry, MeltdownLogEntry, LogEntry } from '@/types';
import { Download } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import GlassCard from '@/components/GlassCard';



export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { activeChildLogs, activeChild, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);



  const moodCounts = useMemo(() => {
    const counts = { good: 0, mixed: 0, challenging: 0 };
    const dailyLogs = activeChildLogs.filter(log => log.type === 'daily');
    
    dailyLogs.forEach(logEntry => {
      const log = logEntry as AnyLogEntry;
      if ('overallRating' in log) {
        const rating = (log as DailyLogEntry).overallRating;
        const mood = rating === 'great' ? 'good' : rating as MoodRating;
        
        if (mood && mood in counts) {
          counts[mood]++;
        }
      }
    });
    return counts;
  }, [activeChildLogs]);

  const totalLogs = moodCounts.good + moodCounts.mixed + moodCounts.challenging;

  const moodTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    const dailyLogs = activeChildLogs.filter(log => log.type === 'daily');
    
    dailyLogs.forEach(logEntry => {
      const log = logEntry as AnyLogEntry;
      if ('moodTags' in log && Array.isArray(log.moodTags)) {
        log.moodTags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [activeChildLogs]);

  const meltdownLogs = useMemo(() => {
    return activeChildLogs
      .map(log => log as AnyLogEntry)
      .filter((log): log is MeltdownLogEntry => log.type === 'meltdown');
  }, [activeChildLogs]);

  const profileBasedInsights = useMemo(() => {
    if (!activeChild) return null;
    
    const insights = [];
    
    if (activeChild.diagnosis?.toLowerCase().includes('autism') || activeChild.diagnosis?.toLowerCase().includes('asd')) {
      const sensoryLogs = activeChildLogs.filter(log => {
        const moodTags = log.type === 'daily' ? (log as DailyLogEntry).moodTags : log.type === 'meltdown' ? [] : (log as LogEntry).moodTags;
        const triggers = log.type === 'meltdown' ? (log as MeltdownLogEntry).triggers : [];
        return moodTags?.includes('sensory') || triggers?.some((t: string) => t.toLowerCase().includes('sensory'));
      });
      insights.push({
        title: 'Sensory Processing',
        value: sensoryLogs.length,
        total: activeChildLogs.length,
        description: 'Logs mentioning sensory experiences',
      });
    }
    
    if (activeChild.diagnosis?.toLowerCase().includes('adhd')) {
      const focusLogs = activeChildLogs.filter(log => {
        const moodTags = log.type === 'daily' ? (log as DailyLogEntry).moodTags : log.type === 'meltdown' ? [] : (log as LogEntry).moodTags;
        return moodTags?.includes('focused');
      });
      insights.push({
        title: 'Focus Tracking',
        value: focusLogs.length,
        total: activeChildLogs.length,
        description: 'Days with good focus',
      });
    }
    
    if (activeChild.commonTriggers && activeChild.commonTriggers.length > 0) {
      const triggerRelatedLogs = activeChildLogs.filter(log => {
        if (log.type === 'meltdown') return true;
        if (log.type === 'daily') return (log as DailyLogEntry).overallRating === 'challenging';
        return (log as LogEntry).moodRating === 'challenging';
      });
      insights.push({
        title: 'Known Trigger Events',
        value: triggerRelatedLogs.length,
        total: activeChildLogs.length,
        description: 'Challenging moments tracked',
      });
    }
    
    return insights;
  }, [activeChild, activeChildLogs]);

  const meltdownStats = useMemo(() => {
    const stats = {
      total: meltdownLogs.length,
      avgDuration: 0,
      severityCounts: { mild: 0, moderate: 0, severe: 0 },
      topTriggers: [] as { trigger: string; count: number }[],
      moodCounts: { angry: 0, crying: 0, scared: 0, neutral: 0 },
    };

    if (meltdownLogs.length === 0) return stats;

    const triggerMap: Record<string, number> = {};
    let totalDuration = 0;

    meltdownLogs.forEach(log => {
      totalDuration += log.durationMinutes;
      stats.severityCounts[log.severity]++;
      stats.moodCounts[log.moodAtEvent]++;
      
      log.triggers.forEach(trigger => {
        triggerMap[trigger] = (triggerMap[trigger] || 0) + 1;
      });
    });

    stats.avgDuration = Math.round(totalDuration / meltdownLogs.length);
    stats.topTriggers = Object.entries(triggerMap)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }, [meltdownLogs]);

  const generatePDFReport = async () => {
    if (!activeChild) return;
    
    setIsGeneratingPDF(true);

    let dateRange = null;
    if (activeChildLogs.length > 0) {
      const dates = activeChildLogs.map(log => new Date(log.date).getTime());
      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));
      dateRange = {
        start: earliest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        end: latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    }
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Insights Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { color: #E89B4E; margin-bottom: 10px; }
            h2 { color: #333; border-bottom: 2px solid #E89B4E; padding-bottom: 10px; margin-top: 30px; }
            .header { margin-bottom: 40px; }
            .date { color: #666; font-size: 14px; }
            .card { background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
            .stat { text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #E89B4E; }
            .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
            .list-item { padding: 10px; border-left: 3px solid #E89B4E; margin: 10px 0; background: white; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px; }
            .badge-good { background: #4ade80; color: white; }
            .badge-mixed { background: #fbbf24; color: white; }
            .badge-challenging { background: #f87171; color: white; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #E89B4E; color: white; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Autism Insights Report</h1>
            <p class="date">Report for ${activeChild.name}${dateRange ? ` | Data from ${dateRange.start} to ${dateRange.end}` : ''}</p>
            <p class="date" style="margin-top: 4px;">Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <h2>Summary</h2>
          <div class="card">
            <div class="stat-grid">
              <div class="stat">
                <div class="stat-value">${activeChildLogs.length}</div>
                <div class="stat-label">Total Entries</div>
              </div>
              <div class="stat">
                <div class="stat-value">${meltdownLogs.length}</div>
                <div class="stat-label">Meltdown Logs</div>
              </div>
              <div class="stat">
                <div class="stat-value">${activeChildLogs.filter(log => {
                  const logDate = new Date(log.date);
                  const now = new Date();
                  return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
                }).length}</div>
                <div class="stat-label">This Month</div>
              </div>
            </div>
          </div>

          <h2>Mood Distribution</h2>
          <div class="card">
            ${totalLogs > 0 ? `
              <div style="display: flex; gap: 20px; align-items: center;">
                <div style="flex: 1;">
                  <span class="badge badge-good">Good: ${Math.round((moodCounts.good / totalLogs) * 100)}%</span>
                  <span class="badge badge-mixed">Mixed: ${Math.round((moodCounts.mixed / totalLogs) * 100)}%</span>
                  <span class="badge badge-challenging">Challenging: ${Math.round((moodCounts.challenging / totalLogs) * 100)}%</span>
                </div>
              </div>
            ` : '<p>No mood data available</p>'}
          </div>

          ${moodTags.length > 0 ? `
            <h2>Most Common Moods</h2>
            <div class="card">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Mood</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  ${moodTags.map(([tag, count], index) => `
                    <tr>
                      <td>#${index + 1}</td>
                      <td>${tag.charAt(0).toUpperCase() + tag.slice(1)}</td>
                      <td>${count} times</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${meltdownStats.total > 0 ? `
            <h2>Meltdown Analysis</h2>
            <div class="card">
              <div class="stat-grid">
                <div class="stat">
                  <div class="stat-value">${meltdownStats.total}</div>
                  <div class="stat-label">Total Meltdowns</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${meltdownStats.avgDuration}m</div>
                  <div class="stat-label">Avg Duration</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${meltdownStats.severityCounts.severe}</div>
                  <div class="stat-label">Severe Events</div>
                </div>
              </div>

              <h3 style="margin-top: 30px;">Severity Distribution</h3>
              <table>
                <tr>
                  <td>Mild</td>
                  <td>${meltdownStats.severityCounts.mild} (${Math.round((meltdownStats.severityCounts.mild / meltdownStats.total) * 100)}%)</td>
                </tr>
                <tr>
                  <td>Moderate</td>
                  <td>${meltdownStats.severityCounts.moderate} (${Math.round((meltdownStats.severityCounts.moderate / meltdownStats.total) * 100)}%)</td>
                </tr>
                <tr>
                  <td>Severe</td>
                  <td>${meltdownStats.severityCounts.severe} (${Math.round((meltdownStats.severityCounts.severe / meltdownStats.total) * 100)}%)</td>
                </tr>
              </table>

              ${meltdownStats.topTriggers.length > 0 ? `
                <h3 style="margin-top: 30px;">Top Triggers</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Trigger</th>
                      <th>Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${meltdownStats.topTriggers.map(({ trigger, count }) => `
                      <tr>
                        <td>${trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                        <td>${count}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
            </div>
          ` : ''}

          <h2>Daily Log Entries</h2>
          ${activeChildLogs
            .map(log => log as AnyLogEntry)
            .filter((log): log is DailyLogEntry => log.type === 'daily' && 'overallRating' in log)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map(dailyLog => {
              const logDate = new Date(dailyLog.date);
              return `
                <div class="card">
                  <h3 style="color: #E89B4E; margin-bottom: 10px;">${logDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                  <p style="margin: 5px 0;"><strong>Rating:</strong> <span class="badge badge-${dailyLog.overallRating === 'great' ? 'good' : dailyLog.overallRating}">${dailyLog.overallRating.charAt(0).toUpperCase() + dailyLog.overallRating.slice(1)} Day</span></p>
                  ${dailyLog.whatWentWell ? `
                    <div style="margin: 15px 0;">
                      <strong style="color: #4ade80;">✓ What Went Well:</strong>
                      <p style="margin: 5px 0 0 0; padding: 10px; background: white; border-radius: 8px;">${dailyLog.whatWentWell}</p>
                    </div>
                  ` : ''}
                  ${dailyLog.whatWasChallenging ? `
                    <div style="margin: 15px 0;">
                      <strong style="color: #f87171;">⚠ What Was Challenging:</strong>
                      <p style="margin: 5px 0 0 0; padding: 10px; background: white; border-radius: 8px;">${dailyLog.whatWasChallenging}</p>
                    </div>
                  ` : ''}
                  ${dailyLog.moodTags && dailyLog.moodTags.length > 0 ? `
                    <p style="margin: 10px 0 5px 0;"><strong>Moods:</strong> ${dailyLog.moodTags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)).join(', ')}</p>
                  ` : ''}
                  ${dailyLog.sleepHours ? `
                    <p style="margin: 5px 0;"><strong>Sleep:</strong> ${dailyLog.sleepHours} hours</p>
                  ` : ''}
                </div>
              `;
            }).join('')}

          <div class="footer">
            <p>Generated by Autism Insights App | Made by Anika Kale</p>
            <p>This report contains confidential information. Please keep it secure.</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `insights-${activeChild.name}-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Insights Report',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Success', 'PDF saved successfully!');
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    return trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>Last 30 Days</Text>
          </View>
          <TouchableOpacity 
            style={styles.pdfButton} 
            onPress={generatePDFReport}
            disabled={isGeneratingPDF || activeChildLogs.length === 0}
          >
            {isGeneratingPDF ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.pdfButtonText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.compactCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
          <Text style={styles.cardTitle}>😊 Mood Distribution</Text>
          {totalLogs > 0 ? (
            <>
              <View style={styles.progressBar}>
                {moodCounts.good > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      {
                        backgroundColor: Colors.goodDay,
                        flex: moodCounts.good,
                      },
                    ]}
                  />
                )}
                {moodCounts.mixed > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      {
                        backgroundColor: Colors.mixedDay,
                        flex: moodCounts.mixed,
                      },
                    ]}
                  />
                )}
                {moodCounts.challenging > 0 && (
                  <View
                    style={[
                      styles.progressSegment,
                      {
                        backgroundColor: Colors.challengingDay,
                        flex: moodCounts.challenging,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.inlineStats}>
                <Text style={styles.inlineStatText}>
                  Good {Math.round((moodCounts.good / totalLogs) * 100)}% • Mixed {Math.round((moodCounts.mixed / totalLogs) * 100)}% • Tough {Math.round((moodCounts.challenging / totalLogs) * 100)}%
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No data yet. Start logging to see insights!</Text>
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

            <View style={styles.severitySection}>
              <Text style={styles.sectionTitle}>Severity Distribution</Text>
              <View style={styles.severityBar}>
                {meltdownStats.severityCounts.mild > 0 && (
                  <View
                    style={[
                      styles.severitySegment,
                      { backgroundColor: '#fbbf24', flex: meltdownStats.severityCounts.mild },
                    ]}
                  />
                )}
                {meltdownStats.severityCounts.moderate > 0 && (
                  <View
                    style={[
                      styles.severitySegment,
                      { backgroundColor: '#fb923c', flex: meltdownStats.severityCounts.moderate },
                    ]}
                  />
                )}
                {meltdownStats.severityCounts.severe > 0 && (
                  <View
                    style={[
                      styles.severitySegment,
                      { backgroundColor: '#ef4444', flex: meltdownStats.severityCounts.severe },
                    ]}
                  />
                )}
              </View>
              <View style={styles.severityLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
                  <Text style={styles.legendText}>Mild ({meltdownStats.severityCounts.mild})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#fb923c' }]} />
                  <Text style={styles.legendText}>Moderate ({meltdownStats.severityCounts.moderate})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Severe ({meltdownStats.severityCounts.severe})</Text>
                </View>
              </View>
            </View>

            {meltdownStats.topTriggers.length > 0 && (
              <View style={styles.triggersSection}>
                <Text style={styles.sectionTitle}>Top Triggers</Text>
                {meltdownStats.topTriggers.map(({ trigger, count }, index) => (
                  <View key={trigger} style={styles.triggerItem}>
                    <View style={styles.triggerInfo}>
                      <Text style={styles.triggerRank}>#{index + 1}</Text>
                      <Text style={styles.triggerName}>{getTriggerLabel(trigger)}</Text>
                    </View>
                    <Text style={styles.triggerCount}>{count}x</Text>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        )}

        {profileBasedInsights && profileBasedInsights.length > 0 && (
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <Text style={styles.cardTitle}>🎯 Personalized Insights</Text>
            <Text style={styles.helperText}>
              Based on {activeChild?.name}&apos;s {activeChild?.diagnosis || 'profile'}
            </Text>
            {profileBasedInsights.map((insight, idx) => (
              <View key={idx} style={styles.insightItem}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightValue}>
                    {insight.value}/{insight.total}
                  </Text>
                </View>
                <Text style={styles.insightDesc}>{insight.description}</Text>
                <View style={styles.insightBar}>
                  <View style={[
                    styles.insightBarFill,
                    { width: `${(insight.value / insight.total) * 100}%` }
                  ]} />
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {activeChild?.commonTriggers && activeChild.commonTriggers.length > 0 && (
          <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <Text style={styles.cardTitle}>⚠️ Trigger Correlation</Text>
            <Text style={styles.helperText}>
              How often known triggers appear in logs
            </Text>
            {activeChild.commonTriggers.slice(0, 5).map((trigger: string, idx: number) => {
              const mentionCount = activeChildLogs.filter(log => {
                const positiveNotes = log.type === 'daily' ? (log as DailyLogEntry).whatWentWell || '' : (log as LogEntry).positiveNotes || '';
                const challengeNotes = log.type === 'daily' ? (log as DailyLogEntry).whatWasChallenging || '' : log.type === 'meltdown' ? (log as MeltdownLogEntry).additionalNotes || '' : (log as LogEntry).challengeNotes || '';
                const logText = `${positiveNotes} ${challengeNotes}`.toLowerCase();
                return logText.includes(trigger.toLowerCase());
              }).length;
              return (
                <View key={idx} style={styles.triggerCorrelationItem}>
                  <Text style={styles.triggerCorrelationName}>{trigger}</Text>
                  <Text style={styles.triggerCorrelationCount}>
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
            <Text style={styles.summaryValue}>{activeChildLogs.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>
              {activeChildLogs.filter(log => {
                const logDate = new Date(log.date);
                const now = new Date();
                return logDate.getMonth() === now.getMonth() && 
                       logDate.getFullYear() === now.getFullYear();
              }).length}
            </Text>
          </View>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    height: 150,
  },
  chartAxis: {
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginRight: 12,
  },
  axisLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chartScroll: {
    flex: 1,
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingVertical: 10,
  },
  barContainer: {
    width: 8,
    height: '100%',
    marginHorizontal: 2,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 12,
  },
  lineChart: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabels: {
    height: 140,
    justifyContent: 'space-between',
    paddingVertical: 20,
    marginRight: 8,
    alignItems: 'center',
  },
  yAxisLabel: {
    fontSize: 18,
  },
  lineChartContainer: {
    paddingVertical: 10,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  chartLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  meltdownGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
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
  meltdownLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  severitySection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  severityBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  severitySegment: {
    height: '100%',
  },
  severityLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  triggersSection: {
    marginTop: 20,
  },
  triggerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  triggerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerRank: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  triggerName: {
    fontSize: 14,
    color: Colors.text,
  },
  triggerCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  progressBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressSegment: {
    height: '100%',
  },
  statsGrid: {
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  inlineStats: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineStatText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactStatText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  statDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagRank: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  tagName: {
    fontSize: 16,
    color: Colors.text,
  },
  tagCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic' as const,
  },
  insightItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  insightDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  insightBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  insightBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  triggerCorrelationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  triggerCorrelationName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  triggerCorrelationCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
