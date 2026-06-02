import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Smartphone, ShieldCheck, Lock } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { getTRPCClient } from '@/lib/trpc';

type Step = 'email' | 'method' | 'verify' | 'newPassword';
type DeliveryMethod = 'email' | 'phone';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, profile } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(profile?.caregiverEmail || '');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('email');
  const [code, setCode] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const codeInputRefs = useRef<(TextInput | null)[]>([null, null, null, null]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trpcClient = useMemo(() => {
    try { return getTRPCClient(); } catch { return null; }
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleRequestCode = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    if (!trpcClient) {
      Alert.alert('Error', 'Service unavailable. Please try again later.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await trpcClient.auth.forgotPassword.requestCode.mutate({
        email: email.trim(),
      });
      if (result.success) {
        setStep('verify');
        startCountdown();
      } else {
        setErrorMessage(result.message || 'Failed to send code');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, trpcClient, startCountdown]);

  const handleResendCode = useCallback(async () => {
    if (countdown > 0 || !trpcClient) return;
    setIsResending(true);
    try {
      await trpcClient.auth.forgotPassword.requestCode.mutate({
        email: email.trim(),
      });
      startCountdown();
      setCode(['', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } catch {
      // Silently fail on resend
    } finally {
      setIsResending(false);
    }
  }, [countdown, email, trpcClient, startCountdown]);

  const handleCodeChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = digit.slice(-1);
    setCode(newCode);

    if (digit && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }, [code]);

  const handleCodeKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }, [code]);

  const codeComplete = code.every((d) => d.length === 1);
  const passwordValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleVerifyCode = useCallback(async () => {
    if (!codeComplete || !trpcClient) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await trpcClient.auth.forgotPassword.verifyCode.mutate({
        email: email.trim(),
        code: code.join(''),
      });
      if (result.success) {
        setStep('newPassword');
      } else {
        setErrorMessage(result.message || 'Invalid code');
        setCode(['', '', '', '']);
        codeInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  }, [codeComplete, code, email, trpcClient]);

  const handleResetPassword = useCallback(async () => {
    if (!passwordValid || !trpcClient) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await trpcClient.auth.forgotPassword.resetPassword.mutate({
        email: email.trim(),
        code: code.join(''),
        newPassword,
      });
      if (result.success) {
        Alert.alert('Password Reset', 'Your password has been reset successfully. You can now log in with your new password.', [
          { text: 'Go to Login', onPress: () => router.replace('/login' as any) },
        ]);
      } else {
        setErrorMessage(result.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  }, [passwordValid, email, code, newPassword, trpcClient, router]);

  const handleMethodSelect = useCallback((method: DeliveryMethod) => {
    setDeliveryMethod(method);
    handleRequestCode();
  }, [handleRequestCode]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderEmailStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Lock size={40} color={Colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Forgot Password?</Text>
      <Text style={styles.stepDescription}>
        Enter your email address and we'll send you a verification code to reset your password.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          placeholderTextColor={Colors.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />
      </View>

      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: Colors.primary }]}
        onPress={() => setStep('method')}
        disabled={!email.trim() || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={[styles.primaryButtonText, { color: Colors.background }]}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderMethodStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <ShieldCheck size={40} color={Colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Choose Method</Text>
      <Text style={styles.stepDescription}>
        How would you like to receive your verification code?
      </Text>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => handleMethodSelect('email')}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <View style={[styles.methodIcon, { backgroundColor: Colors.background }]}>
          <Mail size={28} color={Colors.primary} />
        </View>
        <View style={styles.methodContent}>
          <Text style={styles.methodTitle}>Email</Text>
          <Text style={styles.methodSubtitle}>Send code to {email.trim()}</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => handleMethodSelect('phone')}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <View style={[styles.methodIcon, { backgroundColor: Colors.background }]}>
          <Smartphone size={28} color={Colors.primary} />
        </View>
        <View style={styles.methodContent}>
          <Text style={styles.methodTitle}>Phone</Text>
          <Text style={styles.methodSubtitle}>Send code via SMS</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : null}
      </TouchableOpacity>

      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <ShieldCheck size={40} color={Colors.primary} />
      </View>
      <Text style={styles.stepTitle}>Enter Code</Text>
      <Text style={styles.stepDescription}>
        We sent a 4-digit code to {email.trim()}
      </Text>

      <View style={styles.codeRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { codeInputRefs.current[index] = ref; }}
            style={[
              styles.codeInput,
              { backgroundColor: Colors.surface, borderColor: digit ? Colors.primary : Colors.border, color: Colors.text },
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: codeComplete ? Colors.primary : Colors.borderLight }]}
        onPress={handleVerifyCode}
        disabled={!codeComplete || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={[styles.primaryButtonText, { color: codeComplete ? Colors.background : Colors.textLight }]}>
            Verify Code
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendLabel}>
          {countdown > 0 ? `Resend in ${formatCountdown(countdown)}` : "Didn't receive the code?"}
        </Text>
        <TouchableOpacity
          onPress={handleResendCode}
          disabled={countdown > 0 || isResending}
          activeOpacity={0.7}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text
              style={[
                styles.resendButton,
                { color: countdown > 0 ? Colors.textLight : Colors.primary },
              ]}
            >
              Resend
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNewPasswordStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Lock size={40} color={Colors.primary} />
      </View>
      <Text style={styles.stepTitle}>New Password</Text>
      <Text style={styles.stepDescription}>
        Create a new password for your account.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.textInput}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Min. 8 characters"
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.textInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <Text style={styles.errorMessage}>Passwords do not match</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.showPasswordButton]}
        onPress={() => setShowPassword(!showPassword)}
        activeOpacity={0.7}
      >
        <Text style={[styles.showPasswordText, { color: Colors.primary }]}>
          {showPassword ? 'Hide' : 'Show'} Password
        </Text>
      </TouchableOpacity>

      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: passwordValid ? Colors.primary : Colors.borderLight }]}
        onPress={handleResetPassword}
        disabled={!passwordValid || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={[styles.primaryButtonText, { color: passwordValid ? Colors.background : Colors.textLight }]}>
            Reset Password
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'email') {
              router.back();
            } else if (step === 'method') {
              setStep('email');
            } else if (step === 'verify') {
              setStep('method');
            } else {
              setStep('verify');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'email' && renderEmailStep()}
          {step === 'method' && renderMethodStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'newPassword' && renderNewPasswordStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: Colors.text,
    },
    keyboardAvoid: {
      flex: 1,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    stepContent: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 40,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    stepTitle: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    stepDescription: {
      fontSize: 15,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
    },
    inputGroup: {
      width: '100%',
      gap: 8,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.text,
    },
    textInput: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 16,
      color: Colors.text,
      borderWidth: 2,
      borderColor: Colors.border,
      width: '100%',
    },
    methodCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    methodIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    methodContent: {
      flex: 1,
    },
    methodTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: Colors.text,
      marginBottom: 2,
    },
    methodSubtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
    codeRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    codeInput: {
      width: 60,
      height: 72,
      borderRadius: 14,
      borderWidth: 2,
      fontSize: 32,
      fontWeight: '700' as const,
      textAlign: 'center',
    },
    primaryButton: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    resendLabel: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
    resendButton: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    errorMessage: {
      fontSize: 14,
      color: Colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    showPasswordButton: {
      alignSelf: 'flex-end',
      paddingVertical: 4,
      marginBottom: 16,
    },
    showPasswordText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
  });
