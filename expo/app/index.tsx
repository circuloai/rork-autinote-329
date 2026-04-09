import { useRouter } from 'expo-router';
import { Sparkles, LogIn, Eye } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/home' as any);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleGetStarted = () => {
    router.push('/onboarding' as any);
  };

  const handleLogin = () => {
    router.push('/login' as any);
  };

  const handleExplore = () => {
    router.push('/(tabs)/home' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>AutiNote</Text>
            <Text style={styles.subtitle}>Track, Understand, Support</Text>
            <Text style={styles.description}>
              A thoughtful companion for tracking behaviors, moods, and patterns
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Sparkles size={24} color={Colors.primary} />
              <View style={styles.buttonTextContainer}>
                <Text style={styles.primaryButtonText}>Let&apos;s Get Started</Text>
                <Text style={styles.buttonSubtext}>Create your profile in seconds</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <LogIn size={24} color={Colors.background} />
              <View style={styles.buttonTextContainer}>
                <Text style={styles.secondaryButtonText}>Log In</Text>
                <Text style={styles.buttonSubtextSecondary}>Welcome back!</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={handleExplore}
              activeOpacity={0.7}
            >
              <Eye size={20} color={Colors.background} />
              <Text style={styles.textButtonLabel}>Explore First</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Made with care for families and caregivers
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.text,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.background,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.background,
    opacity: 0.95,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.background,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.background,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.background,
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  buttonSubtextSecondary: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.8,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.background,
  },
  footer: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.8,
    textAlign: 'center',
  },
});
