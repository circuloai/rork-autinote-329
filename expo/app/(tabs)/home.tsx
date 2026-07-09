import { useRouter } from 'expo-router';
import { MessageCircle, Calendar as CalendarIcon, Flame, Bell, Clock, AlertCircle, Settings as SettingsIcon, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Image, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import GlassCard from '@/components/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useCallback } from 'react';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarById } from '@/constants/avatars';
import ScaledText from '@/components/ScaledText';
import type { QuickReminder, CustomReminder } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, streak, activeChildLogs, preferences, sharedAccess, profile, isLoading, chatMessages, chatHistory } = useApp();
  const { isAuthenticated: hasSession } = useAuth();
  const systemScheme = useColorScheme();
  const Colors = useColors(preferences);
  const isDark = preferences?.theme === 'dark' || (preferences?.theme === 'auto' && systemScheme === 'dark');
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

  const avatarOption = useMemo(() => getAvatarById(activeChild?.avatar), [activeChild?.avatar]);

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

  const therapistUnreadCount = useMemo(() => {
    return chatMessages.filter(
      (m) => !m.isRead && m.senderId !== profile?.id
    ).length;
  }, [chatMessages, profile?.id]);

  const recentChatSummaries = useMemo(() => {
    if (!chatHistory || chatHistory.length === 0) return [];
    const summaries: { question: string; answer: string }[] = [];
    for (let i = chatHistory.length - 1; i >= 0 && summaries.length < 3; i--) {
      const msg = chatHistory[i];
      if (msg.role === 'assistant') {
        const answerText = (msg.parts || [])
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join(' ')
          .trim();
        // Find the preceding user message
        let questionText = '';
        for (let j = i - 1; j >= 0; j--) {
          if (chatHistory[j].role === 'user') {
            questionText = (chatHistory[j].parts || [])
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join(' ')
              .trim();
            // Strip context block if present
            const contextIdx = questionText.indexOf('User:');
            if (contextIdx >= 0) {
              questionText = questionText.substring(contextIdx + 5).trim();
            }
            break;
          }
        }
        if (questionText && answerText) {
          summaries.unshift({
            question: questionText.length > 80 ? questionText.substring(0, 80) + '…' : questionText,
            answer: answerText.length > 120 ? answerText.substring(0, 120) + '…' : answerText,
          });
        }
      }
    }
    return summaries;
  }, [chatHistory]);

  const handleOpenChat = useCallback(() => {
    const accepted = (sharedAccess || []).filter((sa) => sa.status === 'accepted');
    if (accepted.length === 0) {
      const goToAutumn = () => router.push('/(tabs)/chat' as any);
      const goToSharedAccess = () => router.push('/settings/shared-access' as any);
      if (Platform.OS === 'web') {
        const ok = typeof window !== 'undefined' && window.confirm('No therapist connected yet. Set up shared access to invite a therapist?\n\nOK to invite, Cancel to chat with Autumn.');
        if (ok) goToSharedAccess(); else goToAutumn();
        return;
      }
      Alert.alert(
        'No therapist connected',
        'Set up shared access to invite a therapist, or chat with Autumn for support right now.',
        [
          { text: 'Chat with Autumn', onPress: goToAutumn },
          { text: 'Set up shared access', style: 'default', onPress: goToSharedAccess },
        ],
        { cancelable: true }
      );
      return;
    }
    const primary = [...accepted].sort((a, b) => {
      const at = a.acceptedAt ? new Date(a.acceptedAt).getTime() : new Date(a.createdAt).getTime();
      const bt = b.acceptedAt ? new Date(b.acceptedAt).getTime() : new Date(b.createdAt).getTime();
      return at - bt;
    })[0];
    router.push(`/therapist-chat?sharedAccessId=${primary.id}` as any);
  }, [router, sharedAccess]);

  const triggers = activeChild?.commonTriggers ?? [];
  const visibleTriggers = triggers.slice(0, 3);
  const extraTriggerCount = Math.max(0, triggers.length - 3);

  const renderProfileContent = () => (
    <>
      <View style={styles.profileTopRow}>
        <View style={styles.profileLeft}>
          <View style={[styles.avatar, { backgroundColor: avatarOption?.bg || Colors.primary + '22' }]}>
            {avatarOption ? (
              <Image source={{ uri: avatarOption.url }} style={styles.avatarImage} />
            ) : (
              <ScaledText style={[styles.avatarText, { color: Colors.primary }]}>
                {activeChild?.name?.charAt(0).toUpperCase() || 'G'}
              </ScaledText>
            )}
          </View>
          <View style={styles.profileNameBlock}>
            <ScaledText
              style={[styles.profileName, { color: Colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {activeChild?.name || 'Guest'}
            </ScaledText>
            <ScaledText style={[styles.profileAge, { color: Colors.textSecondary }]}>Age {activeChild?.age || '-'}</ScaledText>
          </View>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: Colors.accent + '20' }]}>
          <Flame size={14} color={Colors.accent} />
          <ScaledText style={[styles.streakBadgeText, { color: Colors.text }]}>{streak}d</ScaledText>
        </View>
      </View>

      <View style={styles.profileMeta}>
        {recentLog && (
          <View style={[styles.chip, styles.moodChip, { backgroundColor: Colors.accent + '22' }]}>
            <ScaledText style={styles.moodChipEmoji}>{getMoodEmoji(recentLog)}</ScaledText>
            <ScaledText
              style={[styles.chipText, { color: Colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {getMoodLabel(recentLog)}
            </ScaledText>
          </View>
        )}
        {activeChild?.diagnosis && (
          <View style={[styles.chip, { backgroundColor: Colors.primary + '18' }]}>
            <ScaledText
              style={[styles.chipText, { color: Colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {activeChild.diagnosis}
            </ScaledText>
          </View>
        )}
        {visibleTriggers.map((trigger: string, idx: number) => (
          <View key={idx} style={[styles.chip, { backgroundColor: Colors.warning + '22' }]}>
            <ScaledText
              style={[styles.chipText, { color: Colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {trigger}
            </ScaledText>
          </View>
        ))}
        {extraTriggerCount > 0 && (
          <View style={[styles.chip, styles.moreChip, { backgroundColor: Colors.warning + '14' }]}>
            <ScaledText style={[styles.chipText, { color: Colors.textSecondary }]}>
              +{extraTriggerCount} more
            </ScaledText>
          </View>
        )}
      </View>

      <ScaledText style={[styles.tapToViewProfile, { color: Colors.textSecondary }]}>Tap to view full profile ›</ScaledText>
    </>
  );

  if (hasSession && !profile && isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <ScaledText style={{ color: Colors.text, marginTop: 16, fontSize: 16, fontWeight: '600' as const }}>Setting up your profile…</ScaledText>
        <ScaledText style={{ color: Colors.textSecondary, marginTop: 6, fontSize: 13 }}>Just a moment.</ScaledText>
      </View>
    );
  }

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
              {renderProfileContent()}
            </GlassCard>
          ) : (
            <View style={[styles.profileGlass, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
              {renderProfileContent()}
            </View>
          )}
        </TouchableOpacity>

        {hasReminders && (
          Platform.OS === 'ios' ? (
            <GlassCard style={styles.remindersCard} glassEffectStyle="regular" fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderTitleRow}>
                <Bell size={20} color={Colors.text} />
                <ScaledText style={styles.cardTitle}>Reminders</ScaledText>
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
                  <ScaledText style={styles.missedTitle}>Missed</ScaledText>
                </View>
                {reminders.missed.map((reminder) => (
                  <View key={reminder.id} style={[styles.reminderItem, styles.missedReminderItem]}>
                    <Clock size={16} color="#FF9800" />
                    <View style={styles.reminderContent}>
                      <ScaledText style={[styles.reminderLabel, styles.missedLabel]}>{reminder.label}</ScaledText>
                      <ScaledText style={[styles.reminderTime, styles.missedTime]}>{reminder.time}</ScaledText>
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
                  <ScaledText style={styles.upcomingTitle}>Upcoming</ScaledText>
                </View>
                {reminders.upcoming.map((reminder) => (
                  <View key={reminder.id} style={styles.reminderItem}>
                    <View style={[styles.reminderDot, { backgroundColor: Colors.text }]} />
                    <View style={styles.reminderContent}>
                      <ScaledText style={styles.reminderLabel}>{reminder.label}</ScaledText>
                      <ScaledText style={styles.reminderTime}>{reminder.time}</ScaledText>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {reminders.upcoming.length === 0 && reminders.missed.length === 0 && (
              <ScaledText style={styles.noReminders}>No reminders set for today</ScaledText>
            )}
            </GlassCard>
          ) : (
            <View style={[styles.remindersCard, { backgroundColor: Colors.surface }]}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderTitleRow}>
                  <Bell size={20} color={Colors.text} />
                  <ScaledText style={styles.cardTitle}>Reminders</ScaledText>
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
                    <ScaledText style={styles.missedTitle}>Missed</ScaledText>
                  </View>
                  {reminders.missed.map((reminder) => (
                    <View key={reminder.id} style={[styles.reminderItem, styles.missedReminderItem]}>
                      <Clock size={16} color="#FF9800" />
                      <View style={styles.reminderContent}>
                        <ScaledText style={[styles.reminderLabel, styles.missedLabel]}>{reminder.label}</ScaledText>
                        <ScaledText style={[styles.reminderTime, styles.missedTime]}>{reminder.time}</ScaledText>
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
                    <ScaledText style={styles.upcomingTitle}>Upcoming</ScaledText>
                  </View>
                  {reminders.upcoming.map((reminder) => (
                    <View key={reminder.id} style={styles.reminderItem}>
                      <View style={[styles.reminderDot, { backgroundColor: Colors.text }]} />
                      <View style={styles.reminderContent}>
                        <ScaledText style={styles.reminderLabel}>{reminder.label}</ScaledText>
                        <ScaledText style={styles.reminderTime}>{reminder.time}</ScaledText>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {reminders.upcoming.length === 0 && reminders.missed.length === 0 && (
                <ScaledText style={styles.noReminders}>No reminders set for today</ScaledText>
              )}
            </View>
          )
        )}

        <View style={styles.quickActions}>
          <ScaledText style={styles.sectionTitle}>Log Your Day</ScaledText>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.dailyLogAction]}
            onPress={() => router.push('/log/daily' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.logIconContainer}>
              <ScaledText style={styles.logEmoji}>📝</ScaledText>
            </View>
            <View style={styles.actionContent}>
              <ScaledText style={styles.actionTitle}>Daily Log</ScaledText>
              <ScaledText style={styles.actionSubtitle}>Quick mood check & notes</ScaledText>
            </View>
            <View style={styles.arrowContainer}>
              <ScaledText style={styles.arrow}>›</ScaledText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.meltdownLogAction]}
            onPress={() => router.push('/log/meltdown' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.logIconContainer}>
              <ScaledText style={styles.logEmoji}>🌊</ScaledText>
            </View>
            <View style={styles.actionContent}>
              <ScaledText style={styles.actionTitle}>Meltdown Log</ScaledText>
              <ScaledText style={styles.actionSubtitle}>Track triggers & intensity</ScaledText>
            </View>
            <View style={styles.arrowContainer}>
              <ScaledText style={styles.arrow}>›</ScaledText>
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
                    <ScaledText style={[styles.secondaryActionText, { color: Colors.text }]}>Calendar</ScaledText>
                  </GlassCard>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleOpenChat}
                  activeOpacity={0.8}
                  testID="home-chat-button"
                >
                  <GlassCard style={styles.glassSecondaryAction} glassEffectStyle="clear" fallbackStyle={{ backgroundColor: Colors.surface }}>
                    <MessageCircle size={20} color={Colors.text} />
                    <ScaledText style={[styles.secondaryActionText, { color: Colors.text }]}>Therapist</ScaledText>
                    {therapistUnreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <ScaledText style={styles.unreadBadgeText}>
                          {therapistUnreadCount > 99 ? '99+' : therapistUnreadCount}
                        </ScaledText>
                      </View>
                    )}
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
                  <ScaledText style={[styles.secondaryActionText, { color: Colors.primary }]}>Calendar</ScaledText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryAction, { backgroundColor: Colors.surface }]}
                  onPress={handleOpenChat}
                  activeOpacity={0.8}
                  testID="home-chat-button"
                >
                  <View>
                    <MessageCircle size={20} color={Colors.primary} />
                    {therapistUnreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <ScaledText style={styles.unreadBadgeText}>
                          {therapistUnreadCount > 99 ? '99+' : therapistUnreadCount}
                        </ScaledText>
                      </View>
                    )}
                  </View>
                  <ScaledText style={[styles.secondaryActionText, { color: Colors.primary }]}>Therapist</ScaledText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.aiPreview}>
          <ScaledText style={styles.sectionTitle}>AI Insights</ScaledText>
          {recentChatSummaries.length > 0 ? (
            <View>
              <ScaledText style={styles.recentChatsLabel}>Recent conversations with Autumn</ScaledText>
              {recentChatSummaries.map((chat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.aiCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                  onPress={() => router.push('/(tabs)/chat' as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.chatSummaryItem}>
                    <View style={styles.chatSummaryHeader}>
                      <Sparkles size={14} color={Colors.secondary} />
                      <ScaledText style={styles.chatSummaryQuestion} numberOfLines={2}>
                        {chat.question}
                      </ScaledText>
                    </View>
                    <ScaledText style={styles.chatSummaryAnswer} numberOfLines={2}>
                      {chat.answer}
                    </ScaledText>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.continueChatButton, { backgroundColor: Colors.primary }]}
                onPress={() => router.push('/(tabs)/chat' as any)}
                activeOpacity={0.8}
              >
                <MessageCircle size={18} color={Colors.background} />
                <ScaledText style={[styles.continueChatText, { color: Colors.background }]}>
                  Continue chatting
                </ScaledText>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.aiCard, { backgroundColor: Colors.surface, borderColor: Colors.secondary }]}
              onPress={() => router.push('/(tabs)/chat' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.aiEmptyContent}>
                <Sparkles size={28} color={Colors.secondary} />
                <ScaledText style={styles.aiText}>
                  Chat with Autumn for personalized insights and support
                </ScaledText>
                <View style={[styles.startChatButton, { backgroundColor: Colors.primary }] }>
                  <ScaledText style={[styles.startChatText, { color: Colors.background }]}>
                    Start chatting
                  </ScaledText>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>, isDark = false) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    marginBottom: 24,
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileGlass: {
    padding: 22,
    paddingVertical: 24,
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 196,
    justifyContent: 'space-between',
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  profileLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  profileNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  profileAge: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  profileMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  moodChip: {
    gap: 5,
  },
  moodChipEmoji: {
    fontSize: 14,
  },
  moreChip: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  tapToViewProfile: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '500' as const,
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
    backgroundColor: isDark ? Colors.surface : '#DBEAFE',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  meltdownLogAction: {
    backgroundColor: isDark ? Colors.surface : '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  aiText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  aiEmptyContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  startChatButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startChatText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  recentChatsLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 4,
  },
  chatSummaryItem: {
    gap: 8,
  },
  chatSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  chatSummaryQuestion: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    lineHeight: 19,
  },
  chatSummaryAnswer: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingLeft: 22,
  },
  continueChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  continueChatText: {
    fontSize: 15,
    fontWeight: '600' as const,
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
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
});
