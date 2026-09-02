import { useRouter, Stack } from 'expo-router';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Eye,
  Home as HomeIcon,
  LogIn,
  MessageCircle,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  Users,
  Waves,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from '@/constants/colors';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  EXPLORE_FEATURES,
  getExploreAvailability,
  type ExploreFeature,
} from '@/lib/exploreFeatures';

const FEATURE_ICONS = {
  home: HomeIcon,
  'daily-log': BookOpen,
  'meltdown-log': Waves,
  calendar: Calendar,
  insights: TrendingUp,
  autumn: MessageCircle,
  'shared-access': Users,
  settings: SettingsIcon,
} as const;

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, profile, activeChild } = useApp();
  const { isAuthenticated: hasSession, isLoading: authLoading } = useAuth();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const state = {
    hasSession,
    hasProfile: !!profile,
    hasActiveChild: !!activeChild,
  };

  const handleFeaturePress = (feature: ExploreFeature) => {
    const availability = getExploreAvailability(feature, state);
    if (availability === 'sign-in') {
      router.push('/login' as any);
      return;
    }
    if (availability === 'setup') {
      router.push('/onboarding' as any);
      return;
    }
    router.push(feature.path as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.logo}>
              <Sparkles size={22} color={Colors.primary} />
            </View>
            <View style={styles.titleBlock}>
              <ScaledText style={styles.eyebrow}>AUTINOTE</ScaledText>
              <ScaledText style={styles.title}>Explore First</ScaledText>
            </View>
          </View>
          <ScaledText style={styles.subtitle}>
            {hasSession && profile
              ? `Ready for ${activeChild?.name || 'your next profile'}`
              : 'Take a look around before you create an account.'}
          </ScaledText>
        </View>

        {!hasSession && !authLoading && (
          <View style={styles.guestBanner}>
            <View style={styles.guestIcon}>
              <Eye size={18} color={Colors.primary} />
            </View>
            <View style={styles.guestBannerCopy}>
              <ScaledText style={styles.guestTitle}>Guest preview</ScaledText>
              <ScaledText style={styles.guestText}>
                Home and Insights are available to browse. Sign in when you want to log, chat, or connect with a therapist.
              </ScaledText>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/login' as any)}
              style={styles.signInButton}
              activeOpacity={0.8}
            >
              <LogIn size={16} color={Colors.surface} />
              <ScaledText style={styles.signInButtonText}>Sign in</ScaledText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <ScaledText style={styles.sectionTitle}>What you can do</ScaledText>
          <ScaledText style={styles.sectionHint}>
            {hasSession ? 'Your account controls what is available.' : 'Start with a preview, then make it yours.'}
          </ScaledText>
        </View>

        <View style={styles.featureList}>
          {EXPLORE_FEATURES.map((feature) => {
            const availability = getExploreAvailability(feature, state);
            const Icon = FEATURE_ICONS[feature.id];
            const actionLabel = availability === 'sign-in'
              ? 'Sign in'
              : availability === 'setup'
                ? 'Finish setup'
                : 'Open';
            return (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => handleFeaturePress(feature)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${feature.title}, ${actionLabel}`}
              >
                <View style={[styles.featureIcon, {
                  backgroundColor: availability === 'available'
                    ? Colors.primary + '18'
                    : Colors.borderLight,
                }]}>
                  <Icon size={22} color={availability === 'available' ? Colors.primary : Colors.textSecondary} />
                </View>
                <View style={styles.featureCopy}>
                  <View style={styles.featureTitleRow}>
                    <ScaledText style={styles.featureTitle}>{feature.title}</ScaledText>
                    {availability !== 'available' && (
                      <ScaledText style={styles.featureStatus}>
                        {availability === 'sign-in' ? 'Account needed' : 'Setup needed'}
                      </ScaledText>
                    )}
                  </View>
                  <ScaledText style={styles.featureDescription}>{feature.description}</ScaledText>
                </View>
                <View style={styles.featureAction}>
                  <ScaledText style={styles.featureActionText}>{actionLabel}</ScaledText>
                  <ChevronRight size={18} color={Colors.textLight} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScaledText style={styles.footer}>
          Guest previews never write logs or chat to an account.
        </ScaledText>
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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '18',
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
  },
  guestIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '18',
  },
  guestBannerCopy: {
    flex: 1,
  },
  guestTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  guestText: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  signInButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  featureList: {
    gap: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  featureTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  featureStatus: {
    flexShrink: 1,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  featureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  featureActionText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 24,
  },
});