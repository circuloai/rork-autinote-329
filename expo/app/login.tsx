import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ScaledText from '@/components/ScaledText';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!isValid) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      console.log('[Login] Attempting sign in');
      const { error, session } = await signIn(email.trim(), password);
      
      if (error) {
        console.error('[Login] Sign in error:', error.message);
        setErrorMessage(error.message);
        Alert.alert('Login Failed', error.message);
      } else if (!session) {
        const message = 'Sign-in completed without an authenticated session. Please try again.';
        console.error('[Login] Sign in returned no session');
        setErrorMessage(message);
        Alert.alert('Login Failed', message);
      } else {
        console.log('[Login] Sign in successful; navigating to root');
        router.replace('/' as any);
      }
    } catch (err: any) {
      console.error('[Login] Unexpected error:', err);
      const errMsg = err?.message ?? String(err);
      setErrorMessage(errMsg);
      Alert.alert('Error', errMsg.includes('Network') || errMsg.includes('fetch')
        ? 'Unable to connect. Please check your internet connection and try again.'
        : errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <ScaledText style={styles.title}>Welcome Back</ScaledText>
            <ScaledText style={styles.subtitle}>Log in to continue to AutiNote</ScaledText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ScaledText style={styles.label}>Email Address</ScaledText>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <ScaledText style={styles.label}>Password</ScaledText>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, (!isValid || isLoading) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={!isValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <ScaledText style={styles.loginButtonText}>Log In</ScaledText>
              )}
            </TouchableOpacity>

            {errorMessage ? (
              <ScaledText accessibilityRole="alert" style={styles.errorText}>
                {errorMessage}
              </ScaledText>
            ) : null}

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => router.push('/settings/forgot-password' as any)}
              activeOpacity={0.7}
            >
              <ScaledText style={styles.forgotButtonText}>Forgot Password?</ScaledText>
            </TouchableOpacity>


          </View>

          <View style={styles.footer}>
            <ScaledText style={styles.footerText}>Don&apos;t have an account? </ScaledText>
            <TouchableOpacity onPress={() => router.push('/onboarding' as any)}>
              <ScaledText style={styles.footerLink}>Sign Up</ScaledText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  forgotButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
