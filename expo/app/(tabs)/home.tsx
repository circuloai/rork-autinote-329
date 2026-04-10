import { useRouter } from 'expo-router';
import { TrendingUp, Calendar as CalendarIcon, Flame, Bell, Clock, AlertCircle, Settings as SettingsIcon } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '@/components/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useCallback } from 'react';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { QuickReminder, CustomReminder } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, streak, activeChildLogs, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const recentLog = activeChildLogs.length > 0 
    ? activeChildLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const getMoodEmoji = (log: any) => {
    if (log.type === 'daily') {
      switch (log.overallRating) {
        case 'great': return '😊';
        case 'mixed': return '😐';
        case 'challenging': return '😔';
        default: return '😊';
      }
    } else if (log.type === 'meltdown') {
      switch (log.moodAtEvent) {
        case 'angry': return '😡';
        case 'crying': return '😭';
        case 'scared': return '😨';
        case 'neutral': return '😐';
        default: return '🌊';
      }
    }
    return '😊';
  };

  const getMoodLabel = (log: any) => {
    if (log.type === 'daily') {
      const rating = log.overallRating || '';
      return rating ? rating.charAt(0).toUpperCase() + rating.slice(1) + ' Day' : 'Day';
    } else if (log.type === 'meltdown') {
      const mood = log.moodAtEvent || '';
      return mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Meltdown';
    }
    return 'Log';
  };

  const getQuickReminderTime = (type: string) => {
    switch (type) {
      case 'morning': return '7:00 AM';
      case 'afternoon': return '1:00 PM';
      case 'evening': return '8:00 PM';
      case 'sleep': return '9:30 PM';
      default: return '12:00 PM';
    }
  };

  const getQuickReminderLabel = (type: string) => {
    switch (type) {
      case 'morning': return 'Morning Log';
      case 'afternoon': return 'Afternoon Reflection';
      case 'evening': return 'Evening Log';
      case 'sleep': return 'Sleep & Routine';
      default: return 'Reminder';
    }
  };

  const getUpcomingReminders = useCallback(() => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const allReminders: { id: string; label: string; time: string; type: 'quick' | 'custom'; enabled: boolean }[] = [];

    if (preferences?.quickReminders) {
      preferences.quickReminders.forEach((reminder: QuickReminder) => {
        if (reminder.enabled) {
          const timeStr = reminder.time || getQuickReminderTime(reminder.type);
          allReminders.push({
            id: reminder.id,
            label: getQuickReminderLabel(reminder.type),
            time: timeStr,
            type: 'quick',
            enabled: reminder.enabled,
          });
        }
      });
    }

    if (preferences?.customReminders) {
      preferences.customReminders.forEach((reminder: CustomReminder) => {
        if (reminder.enabled) {
          allReminders.push({
            id: reminder.id,
            label: reminder.label,
            time: reminder.time,
            type: 'custom',
            enabled: reminder.enabled,
          });
        }
      });
    }

    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };

    const sorted = allReminders.sort((a, b) => parseTime(a.time) - parseTime(b.time));
    
    const upcoming: typeof allReminders = [];
    const missed: typeof allReminders = [];

    sorted.forEach((reminder) => {
      const reminderTime = parseTime(reminder.time);
      if (reminderTime > currentTime) {
        upcoming.push(reminder);
      } else {
        missed.push(reminder);
      }
    });

    return { upcoming: upcoming.slice(0, 3), missed: missed.slice(0, 2) };
  }, [preferences]);

  const reminders = useMemo(() => getUpcomingReminders(), [getUpcomingReminders]);
  const hasReminders = (reminders.upcoming.length > 0 || reminders.missed.length > 0) && preferences?.reminders;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={{ paddingTop: insets.top + 8 }} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.9}
        >
          {Platform.OS === 'ios' ? (
            <GlassCard style={styles.profileGlass} glassEffectStyle="regular" fallbackStyle={{ backgroundColor: Colors.surface }}>
              <View style={styles.profileTopRow}>
                <View style={styles.profileInfo}>
                  <View style={[styles.avatar, { backgroundColor: Colors.primary + '22' }]}>
                    <Text style={[styles.avatarText, { color: Colors.primary }]}>
                      {activeChild?.name?.charAt(0).toUpperCase() || 'G'}
                    </Text>
                  </View>
                  <View style={styles.profileMainInfo}>
                    <Text style={[styles.profileName, { color: Colors.text }]}>{activeChild?.name || 'Guest'}</Text>
                    <Text style={[styles.profileAge, { color: Colors.textSecondary }]}>Age {activeChild?.age || '-'}</Text>
                  </View>
                </View>

                <View style={styles.profileBadges}>
                  {recentLog && (
                    <View style={[styles.moodBadge, { backgroundColor: Colors.primary + '18' }]}>
                      <Text style={styles.moodBadgeEmoji}>{getMoodEmoji(recentLog)}</Text>
                      <Text style={[styles.moodBadgeLabel, { color: Colors.text }]}>{getMoodLabel(recentLog)}</Text>
                    </View>
                  )}
                  <View style={[styles.streakBadge, { backgroundColor: Colors.accent + '20' }]}>
                    <Flame size={14} color={Colors.accent} />
                    <Text style={[styles.streakBadgeText, { color: Colors.text }]}>{streak}d</Text>
                  </View>
                </View>
              </View>

              <View style={styles.profileMeta}>
                {activeChild?.diagnosis && (
                  <View style={[styles.metaChip, { backgroundColor: Colors.primary + '14' }]}>
                    <Text style={[styles.metaChipText, { color: Colors.text }]}>{activeChild.diagnosis}</Text>
                  </View>
                )}
                {activeChild?.schoolName && (
                  <View style={[styles.metaChip, { backgroundColor: Colors.primary + '14' }]}>
                    <Text style={[styles.metaChipText, { color: Colors.text }]}>{activeChild.schoolName}</Text>
                  </View>
                )}
                {activeChild?.commonTriggers && activeChild.commonTriggers.length > 0 && activeChild.commonTriggers.slice(0, 2).map((trigger: string, idx: number) => (
                  <View key={idx} style={[styles.metaChip, { backgroundColor: Colors.warning + '18' }]}>
                    <Text style={[styles.metaChipText, { color: Colors.text }]}>{trigger}</Text>
                  </View>
                ))}
                {(activeChild?.commonTriggers?.length ?? 0) > 2 && (
                  <Text style={[styles.metaMore, { color: Colors.textSecondary }]}>+{(activeChild?.commonTriggers?.length ?? 0) - 2}</Text>
                )}
              </View>

              <Text style={[styles.tapToViewProfile, { color: Colors.textSecondary }]}>Tap to view full profile ›</Text>
            </GlassCard>
          ) : (
            <View style={[styles.profileGlass, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
              <View style={styles.profileTopRow}>
                <View style={styles.profileInfo}>
                  <View style={[styles.avatar, { backgroundColor: Colors.primary + '22' }]}>
                    <Text style={[styles.avatarText, { color: Colors.primary }]}>
                      {activeChild?.name?.charAt(0).toUpperCase() || 'G'}
                    </Text>
                  </View>
                  <View style={styles.profileMainInfo}>
                    <Text style={[styles.profileName, { color: Colors.text }]}>{activeChild?.name || 'Guest'}</Text>
                    <Text style={[styles.profileAge, { color: Colors.textSecondary }]}>Age {activeChild?.age || '-'}</Text>
                  </View>
                </View>

                <View style={styles.profileBadges}>
                  {recentLog && (
                    <View style={[styles.moodBadge, { backgroundColor: Colors.primary + '18' }]}>
                      <Text style={styles.moodBadgeEmoji}>{getMoodEmoji(recentLog)}</Text>
                      <Text style={[styles.moodBadgeLabel, { color: Colors.text }]}>{getMoodLabel(recentLog)}</Text>
                    </View>
                  )}
                  <View style={[styles.streakBadge, { backgroundColor: Colors.accent + '20' }]}>
                    <Flame size={14} color={Colors.accent} />
                    <Text style={[styles.streakBadgeText, { color: Colors.text }]}>{streak}d</Text>
                  </View>
                </View>
              </View>

              <View style={styles.profileMeta}>
                {activeChild?.diagnosis && (
                  <View style={[styles.metaChip, { backgroundColor: Colors.primary + '14' }]}>
                    <Text style={[styles.metaChipText, { color: Colors.text }]}>{activeChild.diagnosis}</Text>
                  </View>
                )}
                {activeChild?.schoolName && (
                  <View style={[styles.metaChip, { backgroundColor: Colors.primary + '14' }]}>
                    <Text style={[styles.metaChipText, { color: Colors.text }]}>{activeChild.schoolName}</Text>
                  </View>
                )}
                {activeChild?.commonTriggers && activeChild.commonTriggers.length > 0 && activeChild.commonTriggers.slice(0, 2).map((trigger: string, idx: number) => (
                  <View key={idx} style={[styles.metaChip, { backgroundColor: Colors.warning + '18' }]}>
                    <Text style={[styles.metaChipText, { color: Colors.text }]}>{trigger}</Text>
                  </View>
                ))}
                {(activeChild?.commonTriggers?.length ?? 0) > 2 && (
                  <Text style={[styles.metaMore, { color: Colors.textSecondary }]}>+{(activeChild?.commonTriggers?.length ?? 0) - 2}</Text>
                )}
              </View>

              <Text style={[styles.tapToViewProfile, { color: Colors.textSecondary }]}>Tap to view full profile ›</Text>
            </View>
          )}
        </TouchableOpacity>

        {hasReminders && (
          Platform.OS === 'ios' ? (
            <GlassCard style={styles.remindersCard} glassEffectStyle="regular" fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderTitleRow}>
                <Bell size={20} color={Colors.text} />
                <Text style={styles.cardTitle}>Reminders</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/settings' as any)}
                style={styles.settingsButton}
              >
                <SettingsIcon size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {reminders.missed.length > 0 && (
              <View style={styles.missedSection}>
                <View style={styles.missedHeader}>
                  <AlertCircle size={16} color="#FF9800" />
                  <Text style={styles.missedTitle}>Missed</Text>
                </View>
                {reminders.missed.map((reminder) => (
                  <View key={reminder.id} style={[styles.reminderItem, styles.missedReminderItem]}>
                    <Clock size={16} color="#FF9800" />
                    <View style={styles.reminderContent}>
                      <Text style={[styles.reminderLabel, styles.missedLabel]}>{reminder.label}</Text>
                      <Text style={[styles.reminderTime, styles.missedTime]}>{reminder.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {reminders.upcoming.length > 0 && (
              <View style={styles.upcomingSection}>
                {reminders.missed.length > 0 && <View style={styles.reminderDivider} />}
                <View style={styles.upcomingHeader}>
                  <Clock size={16} color={Colors.text} />
                  <Text style={styles.upcomingTitle}>Upcoming</Text>
                </View>
                {reminders.upcoming.map((reminder) => (
                  <View key={reminder.id} style={styles.reminderItem}>
                    <View style={[styles.reminderDot, { backgroundColor: Colors.text }]} />
                    <View style={styles.reminderContent}>
                      <Text style={styles.reminderLabel}>{reminder.label}</Text>
                      <Text style={styles.reminderTime}>{reminder.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {reminders.upcoming.length === 0 && reminders.missed.length === 0 && (
              <Text style={styles.noReminders}>No reminders set for today</Text>
            )}
            </GlassCard>
          ) : (
            <View style={[styles.remindersCard, { backgroundColor: Colors.surface }]}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderTitleRow}>
                  <Bell size={20} color={Colors.text} />
                  <Text style={styles.cardTitle}>Reminders</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push('/(tabs)/settings' as any)}
                  style={styles.settingsButton}
                >
                  <SettingsIcon size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {reminders.missed.length > 0 && (
                <View style={styles.missedSection}>
                  <View style={styles.missedHeader}>
                    <AlertCircle size={16} color="#FF9800" />
                    <Text style={styles.missedTitle}>Missed</Text>
                  </View>
                  {reminders.missed.map((reminder) => (
                    <View key={reminder.id} style={[styles.reminderItem, styles.missedReminderItem]}>
                      <Clock size={16} color="#FF9800" />
                      <View style={styles.reminderContent}>
                        <Text style={[styles.reminderLabel, styles.missedLabel]}>{reminder.label}</Text>
                        <Text style={[styles.reminderTime, styles.missedTime]}>{reminder.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {reminders.upcoming.length > 0 && (
                <View style={styles.upcomingSection}>
                  {reminders.missed.length > 0 && <View style={styles.reminderDivider} />}
                  <View style={styles.upcomingHeader}>
                    <Clock size={16} color={Colors.text} />
                    <Text style={styles.upcomingTitle}>Upcoming</Text>
                  </View>
                  {reminders.upcoming.map((reminder) => (
                    <View key={reminder.id} style={styles.reminderItem}>
                      <View style={[styles.reminderDot, { backgroundColor: Colors.text }]} />
                      <View style={styles.reminderContent}>
                        <Text style={styles.reminderLabel}>{reminder.label}</Text>
                        <Text style={styles.reminderTime}>{reminder.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {reminders.upcoming.length === 0 && reminders.missed.length === 0 && (
                <Text style={styles.noReminders}>No reminders set for today</Text>
              )}
            </View>
          )
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Log Your Day</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.dailyLogAction]}
            onPress={() => router.push('/log/daily' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.logIconContainer}>
              <Text style={styles.logEmoji}>📝</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Daily Log</Text>
              <Text style={styles.actionSubtitle}>Quick mood check & notes</Text>
            </View>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.meltdownLogAction]}
            onPress={() => router.push('/log/meltdown' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.logIconContainer}>
              <Text style={styles.logEmoji}>🌊</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Meltdown Log</Text>
              <Text style={styles.actionSubtitle}>Track triggers & intensity</Text>
            </View>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => router.push('/calendar' as any)}
                  activeOpacity={0.8}
                >
                  <GlassCard style={styles.glassSecondaryAction} glassEffectStyle="clear" fallbackStyle={{ backgroundColor: Colors.surface }}>
                    <CalendarIcon size={20} color={Colors.text} />
                    <Text style={[styles.secondaryActionText, { color: Colors.text }]}>Calendar</Text>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => router.push('/(tabs)/insights' as any)}
                  activeOpacity={0.8}
                >
                  <GlassCard style={styles.glassSecondaryAction} glassEffectStyle="clear" fallbackStyle={{ backgroundColor: Colors.surface }}>
                    <TrendingUp size={20} color={Colors.text} />
                    <Text style={[styles.secondaryActionText, { color: Colors.text }]}>Insights</Text>
                  </GlassCard>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.secondaryAction, { backgroundColor: Colors.surface }]}
                  onPress={() => router.push('/calendar' as any)}
                  activeOpacity={0.8}
                >
                  <CalendarIcon size={20} color={Colors.primary} />
                  <Text style={[styles.secondaryActionText, { color: Colors.primary }]}>Calendar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryAction, { backgroundColor: Colors.surface }]}
                  onPress={() => router.push('/(tabs)/insights' as any)}
                  activeOpacity={0.8}
                >
                  <TrendingUp size={20} color={Colors.primary} />
                  <Text style={[styles.secondaryActionText, { color: Colors.primary }]}>Insights</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.aiPreview}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <TouchableOpacity
            style={[styles.aiCard, { backgroundColor: Colors.surface, borderColor: Colors.secondary }]}
            onPress={() => router.push('/(tabs)/chat' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.aiText}>
              💡 Chat with Autumn for personalized insights and support
            </Text>
          </TouchableOpacity>
        </View>

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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileGlass: {
    padding: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  profileMainInfo: {
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  profileAge: {
    fontSize: 14,
  },
  profileBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  moodBadgeEmoji: {
    fontSize: 14,
  },
  moodBadgeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  profileMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  metaMore: {
    fontSize: 12,
    alignSelf: 'center',
    fontWeight: '500' as const,
  },
  tapToViewProfile: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moodEmoji: {
    fontSize: 48,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  moodDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dailyLogAction: {
    backgroundColor: Colors.text === '#F9FAFB' ? '#142D52' : '#DBEAFE',
    borderWidth: 2,
    borderColor: Colors.text === '#F9FAFB' ? '#1E4A7A' : '#2563EB',
  },
  meltdownLogAction: {
    backgroundColor: Colors.text === '#F9FAFB' ? '#7C3D10' : '#FFF3E0',
    borderWidth: 2,
    borderColor: Colors.text === '#F9FAFB' ? '#B85515' : '#FF9800',
  },
  logIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logEmoji: {
    fontSize: 28,
  },

  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  arrowContainer: {
    marginLeft: 'auto',
  },
  arrow: {
    fontSize: 32,
    fontWeight: '300' as const,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Platform.OS === 'ios' ? 0 : 16,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  glassSecondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  aiPreview: {
    marginBottom: 24,
  },
  aiCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  aiText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  remindersCard: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    padding: 4,
  },
  missedSection: {
    marginBottom: 12,
  },
  missedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  missedTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF9800',
    textTransform: 'uppercase' as const,
  },
  upcomingSection: {
    gap: 8,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    textTransform: 'uppercase' as const,
  },
  reminderDivider: {
    height: 1,
    backgroundColor: Colors.textSecondary,
    opacity: 0.1,
    marginVertical: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  missedReminderItem: {
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text,
  },
  reminderContent: {
    flex: 1,
  },
  reminderLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  missedLabel: {
    color: '#FF9800',
  },
  reminderTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  missedTime: {
    color: '#FF9800',
    opacity: 0.8,
  },
  noReminders: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic' as const,
  },
});
