import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, User, Bell, Palette, BookOpen, TrendingUp, Bot, Lock, BookMarked, Info, LogOut, TestTube, Users, RefreshCw, KeyRound } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import ScaledText from '@/components/ScaledText';

type SettingsItem = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleCheckForUpdates = useCallback(() => {
    Alert.alert('Updates', 'Update checking is not available in this build. Please check your app store for the latest version.');
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? Your data is saved locally.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout(() => {
              router.replace('/' as any);
            });
          },
        },
      ]
    );
  };

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Updates',
      items: [
        {
          icon: <RefreshCw size={24} color={Colors.text} />,
          title: 'Check for Updates',
          subtitle:
            Platform.OS === 'web'
              ? 'Not supported on web preview'
              : 'Force refresh to the latest version',
          onPress: handleCheckForUpdates,
        },
      ],
    },

    {
      title: 'Account',
      items: [
        {
          icon: <User size={24} color={Colors.text} />,
          title: 'My Profile',
          subtitle: 'Edit your personal information',
          onPress: () => {
            router.push('/settings/profile' as any);
          },
        },
        {
          icon: <User size={24} color={Colors.text} />,
          title: 'Child Profile',
          subtitle: 'View and edit child information',
          onPress: () => {
            router.push('/profile' as any);
          },
        },
        {
          icon: <Users size={24} color={Colors.text} />,
          title: 'Shared Access',
          subtitle: 'Manage therapist collaboration',
          onPress: () => {
            router.push('/settings/shared-access' as any);
          },
        },
        {
          icon: <KeyRound size={24} color={Colors.text} />,
          title: 'Forgot Password',
          subtitle: 'Reset your password via verification code',
          onPress: () => {
            router.push('/settings/forgot-password' as any);
          },
        },
      ],
    },
    {
      title: 'App Settings',
      items: [
        {
          icon: <Bell size={24} color={Colors.text} />,
          title: 'Reminders',
          subtitle: 'Set logging reminders',
          onPress: () => {
            router.push('/settings/reminders' as any);
          },
        },
        {
          icon: <Palette size={24} color={Colors.text} />,
          title: 'Customization',
          subtitle: '',
          onPress: () => {
            router.push('/settings/customization' as any);
          },
        },
        {
          icon: <BookOpen size={24} color={Colors.text} />,
          title: 'Journal Preferences',
          subtitle: 'Customize logging categories',
          onPress: () => {
            router.push('/settings/journal-preferences' as any);
          },
        },
        {
          icon: <TrendingUp size={24} color={Colors.text} />,
          title: 'Progress Settings',
          subtitle: 'Configure insights',
          onPress: () => {
            router.push('/settings/progress-settings' as any);
          },
        },
        {
          icon: <Bot size={24} color={Colors.text} />,
          title: 'AI Assistant',
          subtitle: 'Customize Autumn behavior',
          onPress: () => {
            router.push('/settings/autumn-settings' as any);
          },
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          icon: <Lock size={24} color={Colors.text} />,
          title: 'Data & Privacy',
          subtitle: 'Export, backup, security',
          onPress: () => {
            router.push('/settings/data-privacy' as any);
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <BookMarked size={24} color={Colors.text} />,
          title: 'Resources',
          subtitle: 'Help, tutorials, support',
          onPress: () => {
            Alert.alert(
              'Resources & Help',
              'Help & Tutorials:\n\n📝 Daily Logging: Track moods, behaviors, sleep, and daily highlights. Use suggested tags or type your own.\n\n💬 AI Chat: Autumn (your AI companion) can answer questions about autism, behavior patterns, and parenting strategies.\n\n📊 Insights: View mood trends and patterns over time to identify triggers and positive moments.\n\n📅 Calendar: Review past entries and track progress across weeks and months.\n\n💡 Tips:\n• Log daily for best insights\n• Use mood tags consistently\n• Rate meltdowns 1-10 for tracking\n• Chat with Autumn for personalized support\n\nNeed more help? Contact support@autinote.com',
              [{ text: 'Got it' }]
            );
          },
        },
        {
          icon: <Info size={24} color={Colors.text} />,
          title: 'About',
          subtitle: 'App info and developer',
          onPress: () => {
            Alert.alert(
              'AutiNote',
              'Version 1.0.0 (Beta)\n\n📱 About the App:\nAutiNote is a comprehensive behavior tracking and mood logging app designed for parents and caregivers of autistic children. Track daily moods, behaviors, sleep patterns, and meltdowns while gaining insights through AI-powered analysis.\n\nFeatures:\n• Daily mood and behavior logging\n• AI chat assistant (Autumn)\n• Pattern recognition and insights\n• Calendar view of historical data\n• Meltdown tracking with severity ratings\n\n👩\u200d💻 About the Developer:\nCreated by Anika Kale, a high school student at Montgomery High School, passionate about creating tools that make a difference in people\'s lives.\n\nMore features coming soon!\n\n✨ Crafted with love ✨',
              [{ text: 'OK' }]
            );
          },
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background }]}>
        <View style={styles.titleRow}>
          <ScaledText style={styles.title}>Settings</ScaledText>
          <View style={styles.betaBadge}>
            <TestTube size={14} color={Colors.primary} />
            <ScaledText style={styles.betaText}>BETA</ScaledText>
          </View>
        </View>
        <ScaledText style={styles.subtitle}>Under active development</ScaledText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <ScaledText style={styles.sectionTitle}>{section.title}</ScaledText>
            <GlassCard style={styles.card} fallbackStyle={{ backgroundColor: Colors.surface }}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIcon}>{item.icon}</View>
                  <View style={styles.settingContent}>
                    <ScaledText style={styles.settingTitle}>{item.title}</ScaledText>
                    <ScaledText style={styles.settingSubtitle}>{item.subtitle}</ScaledText>
                  </View>
                  <ChevronRight size={20} color={Colors.textLight} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={Colors.error} />
          <ScaledText style={styles.logoutText}>Log Out</ScaledText>
        </TouchableOpacity>

        <View style={styles.creatorBadge}>
          <ScaledText style={styles.creatorText}>Crafted with love 🤍🧩</ScaledText>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  betaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  betaText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  creatorBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  creatorText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
});
