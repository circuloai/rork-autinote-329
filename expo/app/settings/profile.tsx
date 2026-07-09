import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, Check } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import ScaledText from '@/components/ScaledText';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AvatarPicker from '@/components/AvatarPicker';

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, preferences, saveProfile } = useApp();
  const { user } = useAuth();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [name, setName] = useState(profile?.caregiverName || '');
  const [email, setEmail] = useState(profile?.caregiverEmail || user?.email || '');
  const [phone, setPhone] = useState(profile?.caregiverPhone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const profileChanged = name !== (profile?.caregiverName || '') || phone !== (profile?.caregiverPhone || '') || email !== (profile?.caregiverEmail || user?.email || '');
  const passwordValid = newPassword.length >= 8 && newPassword === confirmPassword && currentPassword.length > 0;

  const handleAvatarChange = useCallback(
    (value: string) => {
      if (!profile) return;
      saveProfile({ ...profile, avatar: value });
    },
    [profile, saveProfile],
  );

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updatedProfile = {
        ...profile,
        caregiverName: name.trim() || undefined,
        caregiverPhone: phone.trim() || undefined,
        caregiverEmail: email.trim() || undefined,
      };
      saveProfile(updatedProfile);

      if (email.trim() && email.trim() !== user?.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailErr) {
          console.error('Failed to update auth email:', emailErr.message);
          Alert.alert('Email Update', 'Your profile has been saved. A confirmation email has been sent to your new address to complete the email change.');
        }
      }

      Alert.alert('Profile Saved', 'Your profile has been updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [profile, name, phone, email, user, saveProfile]);

  const handleChangePassword = useCallback(async () => {
    if (!passwordValid) return;
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert('Password Change Failed', error.message);
      } else {
        Alert.alert('Password Changed', 'Your password has been updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  }, [newPassword, passwordValid]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.title}>My Profile</ScaledText>
        <ScaledText style={styles.subtitle}>Edit your personal information</ScaledText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.avatarSection}>
              {user?.id ? (
                <AvatarPicker
                  avatarValue={profile?.avatar}
                  onChangeAvatar={handleAvatarChange}
                  uploadTarget={{ kind: 'profile', userId: user.id }}
                  size={88}
                  colors={Colors}
                  testID="settings-avatar-picker"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color={Colors.textLight} />
                </View>
              )}
              <ScaledText style={styles.avatarLabel}>Profile Picture</ScaledText>
            </View>

            <ScaledText style={styles.sectionTitle}>PERSONAL INFORMATION</ScaledText>
            <View style={styles.card}>
              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <User size={20} color={Colors.primary} />
                </View>
                <View style={styles.fieldContent}>
                  <ScaledText style={styles.label}>Name</ScaledText>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: Colors.borderLight }]} />

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Mail size={20} color={Colors.primary} />
                </View>
                <View style={styles.fieldContent}>
                  <ScaledText style={styles.label}>Email</ScaledText>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@example.com"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: Colors.borderLight }]} />

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Phone size={20} color={Colors.primary} />
                </View>
                <View style={styles.fieldContent}>
                  <ScaledText style={styles.label}>Phone Number</ScaledText>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          </View>

          {profileChanged && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: Colors.primary }]}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Check size={20} color={Colors.background} />
                  <ScaledText style={[styles.saveButtonText, { color: Colors.background }]}>Save Changes</ScaledText>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <ScaledText style={styles.sectionTitle}>SECURITY</ScaledText>
            {!showPasswordSection ? (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setShowPasswordSection(true)}
                activeOpacity={0.7}
              >
                <View style={styles.field}>
                  <View style={styles.fieldIcon}>
                    <Lock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.fieldContent}>
                    <ScaledText style={styles.changePasswordLabel}>Change Password</ScaledText>
                    <ScaledText style={styles.changePasswordHint}>Tap to update your password</ScaledText>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.card}>
                <View style={styles.field}>
                  <View style={styles.fieldIcon}>
                    <Lock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.fieldContent}>
                    <ScaledText style={styles.label}>Current Password</ScaledText>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={styles.passwordInput}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        placeholderTextColor={Colors.textLight}
                        secureTextEntry={!showCurrentPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={styles.eyeButton}
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={20} color={Colors.textLight} />
                        ) : (
                          <Eye size={20} color={Colors.textLight} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: Colors.borderLight }]} />

                <View style={styles.field}>
                  <View style={styles.fieldIcon}>
                    <Lock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.fieldContent}>
                    <ScaledText style={styles.label}>New Password</ScaledText>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={styles.passwordInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Min. 8 characters"
                        placeholderTextColor={Colors.textLight}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}
                      >
                        {showNewPassword ? (
                          <EyeOff size={20} color={Colors.textLight} />
                        ) : (
                          <Eye size={20} color={Colors.textLight} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: Colors.borderLight }]} />

                <View style={styles.field}>
                  <View style={styles.fieldIcon}>
                    <Lock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.fieldContent}>
                    <ScaledText style={styles.label}>Confirm New Password</ScaledText>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={styles.passwordInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        placeholderTextColor={Colors.textLight}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} color={Colors.textLight} />
                        ) : (
                          <Eye size={20} color={Colors.textLight} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <ScaledText style={styles.errorText}>Passwords do not match</ScaledText>
                    )}
                  </View>
                </View>

                <View style={styles.passwordActions}>
                  <TouchableOpacity
                    style={styles.cancelPasswordButton}
                    onPress={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    activeOpacity={0.7}
                  >
                    <ScaledText style={[styles.cancelPasswordText, { color: Colors.textSecondary }]}>Cancel</ScaledText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.updatePasswordButton,
                      { backgroundColor: passwordValid ? Colors.primary : Colors.borderLight },
                    ]}
                    onPress={handleChangePassword}
                    disabled={!passwordValid || isChangingPassword}
                    activeOpacity={0.8}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator color={Colors.background} />
                    ) : (
                      <ScaledText
                        style={[
                          styles.updatePasswordText,
                          { color: passwordValid ? Colors.background : Colors.textLight },
                        ]}
                      >
                        Update Password
                      </ScaledText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
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
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
    keyboardAvoid: {
      flex: 1,
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
    field: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
    },
    fieldIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    fieldContent: {
      flex: 1,
    },
    label: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: Colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.3,
    },
    input: {
      fontSize: 16,
      color: Colors.text,
      paddingVertical: 4,
    },
    divider: {
      height: 1,
      marginLeft: 64,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 24,
      padding: 16,
      borderRadius: 12,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    changePasswordLabel: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: Colors.text,
    },
    changePasswordHint: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      color: Colors.text,
      paddingVertical: 4,
    },
    eyeButton: {
      padding: 8,
    },
    errorText: {
      fontSize: 12,
      color: Colors.error,
      marginTop: 4,
    },
    passwordActions: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    cancelPasswordButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
    },
    cancelPasswordText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    updatePasswordButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    updatePasswordText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: Colors.border,
      borderStyle: 'dashed' as const,
    },
    avatarLabel: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 10,
    },
  });
