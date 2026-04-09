import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Modal, Animated, Alert, ActivityIndicator } from 'react-native';
import { ChevronDown, Chrome, Apple } from 'lucide-react-native';
import { ArrowLeft, ArrowRight, X, Bell, Clock, CheckCircle2, Type, Moon, Volume2, Sparkles } from 'lucide-react-native';

const GRADE_LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);
const FEET_OPTIONS = Array.from({ length: 5 }, (_, i) => i + 2);
const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i);
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import type { UserRole, QuickReminder, CustomReminder, ReminderCategory, ReminderTone, ReminderRepeat } from '@/types';

const PREDEFINED_TRIGGERS = [
  'Loud noises',
  'Bright lights',
  'Uncomfortable textures',
  'Strong smells',
  'Sensory overload',
  'Temperature sensitivity',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { signUp, signInWithOAuth } = useAuth();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverPassword, setCaregiverPassword] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [therapistPhone, setTherapistPhone] = useState('');
  
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showFeetDropdown, setShowFeetDropdown] = useState(false);
  const [showInchesDropdown, setShowInchesDropdown] = useState(false);
  const [weight, setWeight] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTriggers, setCustomTriggers] = useState<string[]>([]);
  const [customTriggerInput, setCustomTriggerInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('parent');

  const [quickReminders, setQuickReminders] = useState<QuickReminder[]>([
    { id: '1', type: 'morning', enabled: false, time: '07:00' },
    { id: '2', type: 'afternoon', enabled: false, time: '13:00' },
    { id: '3', type: 'evening', enabled: false, time: '20:00' },
    { id: '4', type: 'sleep', enabled: false, time: '21:30' },
  ]);
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminderLabel, setNewReminderLabel] = useState('');
  const [newReminderCategory, setNewReminderCategory] = useState<ReminderCategory>('mood');
  const [newReminderTime, setNewReminderTime] = useState('09:00');
  const [newReminderRepeat, setNewReminderRepeat] = useState<ReminderRepeat>('daily');
  const [newReminderTone, setNewReminderTone] = useState<ReminderTone>('chime');
  const [newReminderMessage, setNewReminderMessage] = useState('Would you like to log today notes?');

  const [darkMode, setDarkMode] = useState(false);
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState<'small' | 'medium' | 'large'>('medium');
  const celebrationScale = new Animated.Value(0);



  const handleOAuthSignUp = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        if (error.message !== 'Authentication was cancelled') {
          Alert.alert('Sign Up Error', error.message);
        }
      } else {
        setIsOAuthUser(true);
        setStep(2);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setOauthLoading(null);
    }
  };

  const getFontSize = (baseSize: number): number => {
    const scale = { small: 0.85, medium: 1, large: 1.15 }[fontSizeScale];
    return baseSize * scale;
  };

  const roles: { value: UserRole; label: string }[] = [
    { value: 'parent', label: 'Parent/Guardian' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'therapist', label: 'Therapist' },
    { value: 'caregiver', label: 'Caregiver' },
  ];

  const isStep1Valid = caregiverName.trim().length > 0 && 
                       caregiverEmail.trim().length > 0 && 
                       caregiverPassword.trim().length > 0;

  const isStep2Valid = childName.trim().length > 0 && childAge.trim().length > 0;

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev => 
      prev.includes(trigger) 
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const addCustomTrigger = () => {
    const trimmed = customTriggerInput.trim();
    if (trimmed && !customTriggers.includes(trimmed)) {
      setCustomTriggers(prev => [...prev, trimmed]);
      setCustomTriggerInput('');
    }
  };

  const removeCustomTrigger = (trigger: string) => {
    setCustomTriggers(prev => prev.filter(t => t !== trigger));
  };

  const handleContinue = () => {
    if (step === 1 && isStep1Valid) {
      setStep(2);
    } else if (step === 2 && isStep2Valid) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
      startCelebrationAnimation();
    }
  };

  const toggleQuickReminder = (id: string) => {
    setQuickReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const updateQuickReminderTime = (id: string, time: string) => {
    setQuickReminders(prev => prev.map(r => 
      r.id === id ? { ...r, time } : r
    ));
  };

  const addCustomReminder = () => {
    if (!newReminderLabel.trim()) return;
    
    const reminder: CustomReminder = {
      id: Date.now().toString(),
      label: newReminderLabel,
      category: newReminderCategory,
      time: newReminderTime,
      repeat: newReminderRepeat,
      tone: newReminderTone,
      message: newReminderMessage,
      enabled: true,
    };
    
    setCustomReminders(prev => [...prev, reminder]);
    setShowReminderModal(false);
    setNewReminderLabel('');
    setNewReminderMessage('Would you like to log today notes?');
  };

  const removeCustomReminder = (id: string) => {
    setCustomReminders(prev => prev.filter(r => r.id !== id));
  };

  const startCelebrationAnimation = () => {
    Animated.spring(celebrationScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleComplete = async () => {
    setIsCreatingAccount(true);
    try {
      let userId: string | null = null;

      if (isOAuthUser) {
        console.log('[Onboarding] OAuth user, retrieving session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        userId = currentSession?.user?.id ?? null;

        if (!userId) {
          let attempts = 0;
          const maxAttempts = 20;
          while (attempts < maxAttempts && !userId) {
            await new Promise(resolve => setTimeout(resolve, 250));
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            userId = retrySession?.user?.id ?? null;
            attempts++;
            console.log(`[Onboarding] Checking OAuth session attempt ${attempts}, userId: ${userId}`);
          }
        }

        if (!userId) {
          Alert.alert('Error', 'Failed to retrieve your account. Please try again.');
          setIsCreatingAccount(false);
          return;
        }
      } else {
        console.log('[Onboarding] Starting signup process...');
        const { error, user, session, needsEmailConfirmation } = await signUp(caregiverEmail.trim(), caregiverPassword);
        
        if (error) {
          if (error.message.includes('already registered')) {
            Alert.alert(
              'Account Exists',
              'An account with this email already exists. Please log in instead.',
              [{ text: 'Go to Login', onPress: () => router.push('/login' as any) }]
            );
          } else {
            Alert.alert('Sign Up Error', error.message);
          }
          setIsCreatingAccount(false);
          return;
        }

        if (needsEmailConfirmation) {
          console.log('[Onboarding] Email confirmation required, user created:', user?.id);
          Alert.alert(
            'Check Your Email',
            'We\'ve sent a confirmation link to your email. Please confirm your email and then log in.',
            [{ text: 'OK', onPress: () => router.push('/login' as any) }]
          );
          setIsCreatingAccount(false);
          return;
        }

        console.log('[Onboarding] Signup successful with immediate session');
        userId = user?.id ?? session?.user?.id ?? null;
        
        if (!userId) {
          let attempts = 0;
          const maxAttempts = 20;
          while (attempts < maxAttempts && !userId) {
            await new Promise(resolve => setTimeout(resolve, 250));
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            userId = currentSession?.user?.id ?? null;
            attempts++;
            console.log(`[Onboarding] Checking session attempt ${attempts}, userId: ${userId}`);
          }
        }

        if (!userId) {
          Alert.alert('Error', 'Failed to establish session. Please try logging in.');
          setIsCreatingAccount(false);
          return;
        }
      }

      console.log('[Onboarding] Session established, saving profile to Supabase...');

      const allTriggers = [...selectedTriggers, ...customTriggers];
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          role: selectedRole,
          caregiver_name: isOAuthUser ? null : caregiverName,
          caregiver_email: isOAuthUser ? null : caregiverEmail,
          caregiver_phone: isOAuthUser ? null : (caregiverPhone || null),
          therapist_phone: therapistPhone || null,
          is_explore_mode: false,
        })
        .select()
        .single();

      if (profileError) {
        console.error('[Onboarding] Profile insert error:', profileError);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        setIsCreatingAccount(false);
        return;
      }

      console.log('[Onboarding] Profile saved:', profileData.id);

      const { data: childData, error: childError } = await supabase
        .from('children')
        .insert({
          profile_id: profileData.id,
          name: childName,
          age: parseInt(childAge),
          diagnosis: diagnosis || null,
          grade_level: gradeLevel || null,
          school_name: schoolName || null,
          height: heightFeet ? `${heightFeet}'${heightInches || '0'}"` : null,
          weight: weight || null,
          common_triggers: allTriggers,
        })
        .select()
        .single();

      if (childError) {
        console.error('[Onboarding] Child insert error:', childError);
      } else {
        console.log('[Onboarding] Child saved:', childData.id);
        
        await supabase
          .from('profiles')
          .update({ active_child_id: childData.id })
          .eq('id', profileData.id);
      }

      const { error: prefsError } = await supabase
        .from('preferences')
        .insert({
          user_id: userId,
          theme: darkMode ? 'dark' : 'light',
          color_theme: 'mint',
          font_size: fontSizeScale,
          text_to_speech: textToSpeech,
          reminders: quickReminders.some(r => r.enabled) || customReminders.length > 0,
          quick_reminders: quickReminders,
          custom_reminders: customReminders,
        });

      if (prefsError) {
        console.error('[Onboarding] Preferences insert error:', prefsError);
      } else {
        console.log('[Onboarding] Preferences saved');
      }

      console.log('[Onboarding] All data saved, navigating to home...');
      router.replace('/(tabs)/home' as any);
    } catch (err) {
      console.error('[Onboarding] Unexpected error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      Alert.alert('Error', message.includes('fetch') || message.includes('network') || message.includes('Network')
        ? 'Unable to connect to the server. Please check your internet connection and try again.'
        : message);
      setIsCreatingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <TouchableOpacity
              style={styles.backToWelcome}
              onPress={() => router.back()}
              activeOpacity={0.7}
              testID="back-to-welcome"
            >
              <ArrowLeft size={20} color={Colors.textSecondary} />
              <Text style={styles.backToWelcomeText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: getFontSize(32) }]}>
              {step === 1 ? "Let's Get Started" : step === 2 ? "Child Information" : step === 3 ? "Let's Set Up Your Daily Reminders" : step === 4 ? "Theme & Accessibility" : "You're All Set!"}
            </Text>
            <Text style={[styles.subtitle, { fontSize: getFontSize(16) }]}>
              {step === 1 
                ? "Please provide your information as a caregiver" 
                : step === 2
                ? "Tell us about your child to personalize the experience"
                : step === 3
                ? "A little structure goes a long way. Choose when you'd like gentle reminders to log your day."
                : step === 4
                ? "Visual comfort and inclusivity"
                : "Welcome to the AutiNote family. Let's make today a little easier, one log at a time."}
            </Text>
          </View>

          {step < 5 && (
            <View style={styles.stepIndicator}>
              {!isOAuthUser && <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />}
              <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 3 && styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 4 && styles.stepDotActive]} />
            </View>
          )}

          {step === 1 && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Name *</Text>
                <TextInput
                  style={styles.input}
                  value={caregiverName}
                  onChangeText={setCaregiverName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={caregiverEmail}
                  onChangeText={setCaregiverEmail}
                  placeholder="your.email@example.com"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={caregiverPassword}
                  onChangeText={setCaregiverPassword}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={caregiverPhone}
                  onChangeText={setCaregiverPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Therapist/Pediatrician Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={therapistPhone}
                  onChangeText={setTherapistPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.socialDividerContainer}>
                <View style={styles.socialDividerLine} />
                <Text style={styles.socialDividerText}>or sign up with</Text>
                <View style={styles.socialDividerLine} />
              </View>

              <View style={styles.socialButtonsRow}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOAuthSignUp('google')}
                  disabled={oauthLoading !== null}
                  activeOpacity={0.8}
                  testID="google-signup"
                >
                  {oauthLoading === 'google' ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <>
                      <Chrome size={20} color={Colors.text} />
                      <Text style={styles.socialButtonText}>Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.appleSocialButton]}
                  onPress={() => handleOAuthSignUp('apple')}
                  disabled={oauthLoading !== null}
                  activeOpacity={0.8}
                  testID="apple-signup"
                >
                  {oauthLoading === 'apple' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Apple size={20} color="#FFFFFF" />
                      <Text style={styles.appleButtonText}>Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Child&apos;s Name *</Text>
                <TextInput
                  style={styles.input}
                  value={childName}
                  onChangeText={setChildName}
                  placeholder="Enter name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Age *</Text>
                <TextInput
                  style={styles.input}
                  value={childAge}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setChildAge(numericValue);
                  }}
                  placeholder="Enter age"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Diagnosis</Text>
                <TextInput
                  style={styles.input}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  placeholder="e.g., Autism Spectrum Disorder"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Grade Level</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    setShowGradeDropdown(!showGradeDropdown);
                    setShowFeetDropdown(false);
                    setShowInchesDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={gradeLevel ? styles.dropdownTriggerText : styles.dropdownPlaceholder}>
                    {gradeLevel ? `Grade ${gradeLevel}` : 'Select grade'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showGradeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {GRADE_LEVELS.map((grade) => (
                        <TouchableOpacity
                          key={grade}
                          style={[
                            styles.dropdownItem,
                            gradeLevel === String(grade) && styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setGradeLevel(String(grade));
                            setShowGradeDropdown(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            gradeLevel === String(grade) && styles.dropdownItemTextActive,
                          ]}>
                            Grade {grade}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>School Name</Text>
                <TextInput
                  style={styles.input}
                  value={schoolName}
                  onChangeText={setSchoolName}
                  placeholder="Enter school name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Height</Text>
                <View style={styles.twoColumn}>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => {
                        setShowFeetDropdown(!showFeetDropdown);
                        setShowGradeDropdown(false);
                        setShowInchesDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={heightFeet ? styles.dropdownTriggerText : styles.dropdownPlaceholder}>
                        {heightFeet ? `${heightFeet} ft` : 'Feet'}
                      </Text>
                      <ChevronDown size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    {showFeetDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView style={styles.dropdownScrollSmall} nestedScrollEnabled>
                          {FEET_OPTIONS.map((ft) => (
                            <TouchableOpacity
                              key={ft}
                              style={[
                                styles.dropdownItem,
                                heightFeet === String(ft) && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setHeightFeet(String(ft));
                                setShowFeetDropdown(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                heightFeet === String(ft) && styles.dropdownItemTextActive,
                              ]}>
                                {ft} ft
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => {
                        setShowInchesDropdown(!showInchesDropdown);
                        setShowGradeDropdown(false);
                        setShowFeetDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={heightInches !== '' ? styles.dropdownTriggerText : styles.dropdownPlaceholder}>
                        {heightInches !== '' ? `${heightInches} in` : 'Inches'}
                      </Text>
                      <ChevronDown size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    {showInchesDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView style={styles.dropdownScrollSmall} nestedScrollEnabled>
                          {INCHES_OPTIONS.map((inch) => (
                            <TouchableOpacity
                              key={inch}
                              style={[
                                styles.dropdownItem,
                                heightInches === String(inch) && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setHeightInches(String(inch));
                                setShowInchesDropdown(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                heightInches === String(inch) && styles.dropdownItemTextActive,
                              ]}>
                                {inch} in
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Weight</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g., 65 lbs"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Common Triggers</Text>
                <Text style={styles.sublabel}>Select all that apply</Text>
                <View style={styles.triggerGrid}>
                  {PREDEFINED_TRIGGERS.map((trigger) => (
                    <TouchableOpacity
                      key={trigger}
                      style={[
                        styles.triggerButton,
                        selectedTriggers.includes(trigger) && styles.triggerButtonActive,
                      ]}
                      onPress={() => toggleTrigger(trigger)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.triggerText,
                          selectedTriggers.includes(trigger) && styles.triggerTextActive,
                        ]}
                      >
                        {trigger}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.otherButton}
                  onPress={() => setShowCustomInput(!showCustomInput)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.otherButtonText}>Other</Text>
                </TouchableOpacity>

                {showCustomInput && (
                  <View style={styles.customInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={customTriggerInput}
                      onChangeText={setCustomTriggerInput}
                      placeholder="Add custom trigger"
                      placeholderTextColor={Colors.textLight}
                      onSubmitEditing={addCustomTrigger}
                    />
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={addCustomTrigger}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {customTriggers.length > 0 && (
                  <View style={styles.customTriggersContainer}>
                    {customTriggers.map((trigger, index) => (
                      <View key={index} style={styles.customTriggerChip}>
                        <Text style={styles.customTriggerText}>{trigger}</Text>
                        <TouchableOpacity
                          onPress={() => removeCustomTrigger(trigger)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={16} color={Colors.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Role</Text>
                <View style={styles.roleGrid}>
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleButton,
                        selectedRole === role.value && styles.roleButtonActive,
                      ]}
                      onPress={() => setSelectedRole(role.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          selectedRole === role.value && styles.roleTextActive,
                        ]}
                      >
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.form}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Theme & Accessibility</Text>
                
                <View style={styles.accessibilityCard}>
                  <View style={styles.accessibilityRow}>
                    <Moon size={20} color={Colors.primary} />
                    <View style={styles.accessibilityInfo}>
                      <Text style={styles.accessibilityLabel}>Dark Mode</Text>
                      <Text style={styles.accessibilityDesc}>Reduce eye strain in low light</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggle, darkMode && styles.toggleActive]}
                      onPress={() => setDarkMode(!darkMode)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toggleCircle, darkMode && styles.toggleCircleActive]} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.accessibilityCard}>
                  <View style={styles.accessibilityRow}>
                    <Volume2 size={20} color={Colors.primary} />
                    <View style={styles.accessibilityInfo}>
                      <Text style={styles.accessibilityLabel}>Text-to-Speech Mode</Text>
                      <Text style={styles.accessibilityDesc}>Audio narration enabled</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggle, textToSpeech && styles.toggleActive]}
                      onPress={() => setTextToSpeech(!textToSpeech)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toggleCircle, textToSpeech && styles.toggleCircleActive]} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.accessibilityCard}>
                  <View style={styles.fontSizeSection}>
                    <View style={styles.fontSizeHeader}>
                      <Type size={20} color={Colors.primary} />
                      <Text style={styles.accessibilityLabel}>Font Size</Text>
                    </View>
                    <View style={styles.fontSizeOptions}>
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.fontSizeButton,
                            fontSizeScale === size && styles.fontSizeButtonActive,
                          ]}
                          onPress={() => setFontSizeScale(size)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.fontSizeText,
                              fontSizeScale === size && styles.fontSizeTextActive,
                            ]}
                          >
                            {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                          </Text>
                          <Text
                            style={[
                              styles.fontSizeLabel,
                              fontSizeScale === size && styles.fontSizeLabelActive,
                            ]}
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {step === 5 && (
            <View style={styles.celebrationContainer}>
              <Animated.View style={[
                styles.celebrationContent,
                { transform: [{ scale: celebrationScale }] }
              ]}>
                <View style={styles.sparkleContainer}>
                  <Sparkles size={64} color={Colors.primary} />
                </View>
                <Text style={styles.celebrationTitle}>You&apos;re All Set!</Text>
                <Text style={styles.celebrationSubtitle}>
                  Welcome to the AutiNote family.
                  {"\n"}Let&apos;s make today a little easier, one log at a time.
                </Text>
              </Animated.View>

              <View style={styles.celebrationButtons}>
                <TouchableOpacity
                  style={[styles.dashboardButton, isCreatingAccount && styles.buttonDisabled]}
                  onPress={handleComplete}
                  disabled={isCreatingAccount}
                  activeOpacity={0.8}
                >
                  {isCreatingAccount ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logNowButton, isCreatingAccount && styles.buttonDisabled]}
                  onPress={handleComplete}
                  disabled={isCreatingAccount}
                  activeOpacity={0.8}
                >
                  {isCreatingAccount ? (
                    <ActivityIndicator color={Colors.background} />
                  ) : (
                    <>
                      <Text style={styles.logNowButtonText}>Start Logging Now</Text>
                      <ArrowRight size={20} color={Colors.background} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.form}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Option Buttons</Text>
                
                {quickReminders.map((reminder) => {
                  const config = {
                    morning: { title: 'Morning Log', desc: 'Start your day check-in', time: '6:30–8:00 AM' },
                    afternoon: { title: 'Afternoon Reflection', desc: 'Midday update', time: '12:00–2:00 PM' },
                    evening: { title: 'Evening Log', desc: 'Reflect on the day', time: '7:00–9:00 PM' },
                    sleep: { title: 'Sleep & Routine Reminder', desc: 'Bedtime summary', time: 'Before 10:00 PM' },
                  }[reminder.type];

                  return (
                    <View key={reminder.id} style={styles.reminderCard}>
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderInfo}>
                          <View style={styles.reminderTitleRow}>
                            <Bell size={18} color={Colors.primary} />
                            <Text style={styles.reminderTitle}>{config.title}</Text>
                          </View>
                          <Text style={styles.reminderDesc}>{config.desc}</Text>
                          <Text style={styles.reminderTime}>{config.time}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.toggle, reminder.enabled && styles.toggleActive]}
                          onPress={() => toggleQuickReminder(reminder.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.toggleCircle, reminder.enabled && styles.toggleCircleActive]} />
                        </TouchableOpacity>
                      </View>
                      {reminder.enabled && (
                        <View style={styles.timeInputContainer}>
                          <Clock size={16} color={Colors.textSecondary} />
                          <TextInput
                            style={styles.timeInput}
                            value={reminder.time}
                            onChangeText={(text) => updateQuickReminderTime(reminder.id, text)}
                            placeholder="HH:MM"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="numbers-and-punctuation"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Custom Reminder Creator</Text>
                <TouchableOpacity
                  style={styles.createReminderButton}
                  onPress={() => setShowReminderModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createReminderText}>Create Your Own Reminder</Text>
                  <ArrowRight size={18} color={Colors.primary} />
                </TouchableOpacity>

                {customReminders.length > 0 && (
                  <View style={styles.customRemindersPreview}>
                    {customReminders.map((reminder) => (
                      <View key={reminder.id} style={styles.customReminderChip}>
                        <View>
                          <Text style={styles.customReminderLabel}>{reminder.label}</Text>
                          <Text style={styles.customReminderTime}>{reminder.time} • {reminder.repeat}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeCustomReminder(reminder.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={18} color={Colors.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {(quickReminders.some(r => r.enabled) || customReminders.length > 0) && (
                <View style={styles.previewSection}>
                  <View style={styles.previewHeader}>
                    <CheckCircle2 size={20} color={Colors.primary} />
                    <Text style={styles.previewTitle}>Your Reminders</Text>
                  </View>
                  <Text style={styles.previewNote}>
                    You can adjust reminders anytime in Settings → Notifications.
                  </Text>
                </View>
              )}
            </View>
          )}

          {step < 5 && (
            <View style={styles.buttonContainer}>
              {step > 1 && !(isOAuthUser && step === 2) && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  step === 1 && !isStep1Valid && styles.continueButtonDisabled,
                  step === 2 && !isStep2Valid && styles.continueButtonDisabled,
                  step > 1 && styles.continueButtonExpanded,
                ]}
                onPress={handleContinue}
                disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>
                  {step === 1 || step === 2 || step === 3 ? 'Continue' : 'Complete Setup'}
                </Text>
                {step < 4 && <ArrowRight size={20} color={Colors.background} />}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showReminderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowReminderModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Your Own Reminder</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Reminder Name *</Text>
              <TextInput
                style={styles.input}
                value={newReminderLabel}
                onChangeText={setNewReminderLabel}
                placeholder="e.g., After Therapy Session"
                placeholderTextColor={Colors.textLight}
                autoFocus
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryGrid}>
                {(['mood', 'behavior', 'sleep', 'food', 'therapy', 'other'] as ReminderCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      newReminderCategory === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setNewReminderCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        newReminderCategory === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                value={newReminderTime}
                onChangeText={setNewReminderTime}
                placeholder="HH:MM"
                placeholderTextColor={Colors.textLight}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Repeat</Text>
              <View style={styles.repeatGrid}>
                {(['daily', 'weekdays', 'custom'] as ReminderRepeat[]).map((rep) => (
                  <TouchableOpacity
                    key={rep}
                    style={[
                      styles.repeatButton,
                      newReminderRepeat === rep && styles.repeatButtonActive,
                    ]}
                    onPress={() => setNewReminderRepeat(rep)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.repeatText,
                        newReminderRepeat === rep && styles.repeatTextActive,
                      ]}
                    >
                      {rep.charAt(0).toUpperCase() + rep.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Tone</Text>
              <View style={styles.toneGrid}>
                {[{ value: 'chime' as const, label: 'Gentle chime 🎵' }, { value: 'silent' as const, label: 'Silent notification 🔕' }, { value: 'text' as const, label: 'Text only 💬' }].map((tone) => (
                  <TouchableOpacity
                    key={tone.value}
                    style={[
                      styles.toneButton,
                      newReminderTone === tone.value && styles.toneButtonActive,
                    ]}
                    onPress={() => setNewReminderTone(tone.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toneText,
                        newReminderTone === tone.value && styles.toneTextActive,
                      ]}
                    >
                      {tone.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Notification Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newReminderMessage}
                onChangeText={setNewReminderMessage}
                placeholder="Enter your custom message"
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowReminderModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                !newReminderLabel.trim() && styles.modalSaveButtonDisabled,
              ]}
              onPress={addCustomReminder}
              disabled={!newReminderLabel.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSaveText}>Save Reminder</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    paddingBottom: 20,
  },
  backToWelcome: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start' as const,
  },
  backToWelcomeText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  header: {
    marginBottom: 24,
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
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
  sublabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -4,
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
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  triggerButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  triggerButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  triggerTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  otherButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  otherButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  customTriggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  customTriggerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  customTriggerText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  roleTextActive: {
    color: Colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonExpanded: {
    flex: 2,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  reminderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 12,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reminderInfo: {
    flex: 1,
    gap: 4,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  reminderDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  reminderTime: {
    fontSize: 13,
    color: Colors.textLight,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  createReminderText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  customRemindersPreview: {
    gap: 10,
    marginTop: 8,
  },
  customReminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '15',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  customReminderLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  customReminderTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewSection: {
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  previewNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalInputGroup: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  categoryTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  repeatGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  repeatButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  repeatButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  repeatText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  repeatTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  toneGrid: {
    gap: 10,
  },
  toneButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  toneButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  toneText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  toneTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    borderColor: Colors.primary,
  },
  themeBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  accessibilityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  accessibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accessibilityInfo: {
    flex: 1,
  },
  accessibilityLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  accessibilityDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fontSizeSection: {
    gap: 12,
  },
  fontSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  fontSizeButton: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 4,
  },
  fontSizeButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  fontSizeText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  fontSizeTextActive: {
    color: Colors.primary,
  },
  fontSizeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fontSizeLabelActive: {
    color: Colors.primary,
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  celebrationContent: {
    alignItems: 'center',
    marginBottom: 48,
  },
  sparkleContainer: {
    marginBottom: 24,
  },
  celebrationTitle: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  celebrationButtons: {
    width: '100%',
    gap: 12,
  },
  dashboardButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dashboardButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  logNowButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logNowButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dropdownTrigger: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: Colors.text,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: Colors.textLight,
  },
  dropdownList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownScrollSmall: {
    maxHeight: 160,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  socialDividerContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginTop: 4,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  socialDividerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  socialButtonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  appleSocialButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
