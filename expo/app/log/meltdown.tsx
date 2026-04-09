import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, ArrowLeft } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import CustomSlider from '@/components/CustomSlider';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { MeltdownMood, MeltdownTrigger, MeltdownSeverity, MeltdownLogEntry } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;

export default function MeltdownLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, saveLog } = useApp();

  const mapChildTriggerToMeltdownTrigger = (trigger: string): MeltdownTrigger | null => {
    const lowerTrigger = trigger.toLowerCase();
    if (lowerTrigger.includes('loud') || lowerTrigger.includes('noise')) return 'loud_noise';
    if (lowerTrigger.includes('routine') || lowerTrigger.includes('change') || lowerTrigger.includes('schedule')) return 'routine_change';
    if (lowerTrigger.includes('sensory') || lowerTrigger.includes('overload') || lowerTrigger.includes('texture') || lowerTrigger.includes('light') || lowerTrigger.includes('smell')) return 'sensory_overload';
    if (lowerTrigger.includes('hunger') || lowerTrigger.includes('food')) return 'hunger';
    if (lowerTrigger.includes('social') || lowerTrigger.includes('people') || lowerTrigger.includes('crowd')) return 'social_stress';
    return null;
  };

  const getSuggestedTriggers = (): MeltdownTrigger[] => {
    if (!activeChild?.commonTriggers) return [];
    const mapped: (MeltdownTrigger | null)[] = activeChild.commonTriggers
      .map((t: string) => mapChildTriggerToMeltdownTrigger(t));
    const filtered: MeltdownTrigger[] = mapped.filter((t): t is MeltdownTrigger => t !== null);
    return [...new Set(filtered)];
  };

  const suggestedTriggersFromProfile = getSuggestedTriggers();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [moodAtEvent, setMoodAtEvent] = useState<MeltdownMood | null>(null);
  const [triggers, setTriggers] = useState<MeltdownTrigger[]>([]);
  const [severity, setSeverity] = useState<MeltdownSeverity | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const moodOptions: { value: MeltdownMood; emoji: string; label: string }[] = [
    { value: 'angry', emoji: '😡', label: 'Angry' },
    { value: 'crying', emoji: '😭', label: 'Crying' },
    { value: 'scared', emoji: '😨', label: 'Scared' },
    { value: 'neutral', emoji: '😐', label: 'Neutral' },
  ];

  const triggerOptions: { value: MeltdownTrigger; emoji: string; label: string; suggested?: boolean }[] = [
    { value: 'loud_noise', emoji: '🔊', label: 'Loud noise', suggested: suggestedTriggersFromProfile.includes('loud_noise') },
    { value: 'routine_change', emoji: '🔄', label: 'Change in routine', suggested: suggestedTriggersFromProfile.includes('routine_change') },
    { value: 'sensory_overload', emoji: '⚡', label: 'Sensory overload', suggested: suggestedTriggersFromProfile.includes('sensory_overload') },
    { value: 'hunger', emoji: '🍽️', label: 'Hunger/Food related', suggested: suggestedTriggersFromProfile.includes('hunger') },
    { value: 'social_stress', emoji: '👥', label: 'Social stress', suggested: suggestedTriggersFromProfile.includes('social_stress') },
    { value: 'unknown', emoji: '❓', label: 'Unknown' },
  ];

  const sortedTriggerOptions = [
    ...triggerOptions.filter(opt => opt.suggested),
    ...triggerOptions.filter(opt => !opt.suggested),
  ];

  const severityOptions: { value: MeltdownSeverity; emoji: string; label: string; color: string }[] = [
    { value: 'mild', emoji: '⚠️', label: 'Mild', color: '#FFB74D' },
    { value: 'moderate', emoji: '🔶', label: 'Moderate', color: '#FF9800' },
    { value: 'severe', emoji: '🔴', label: 'Severe', color: '#F44336' },
  ];

  const toggleTrigger = (trigger: MeltdownTrigger) => {
    setTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return moodAtEvent !== null;
      case 2:
        return triggers.length > 0;
      case 3:
        return severity !== null;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canGoNext()) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    if (!moodAtEvent || triggers.length === 0 || !severity) {
      Alert.alert('Missing Information', 'Please complete all required steps');
      return;
    }

    if (!activeChild) {
      Alert.alert('Error', 'No active child profile');
      return;
    }

    const logEntry: MeltdownLogEntry = {
      id: Crypto.randomUUID(),
      childId: activeChild.id,
      date: new Date().toISOString(),
      type: 'meltdown',
      moodAtEvent,
      triggers,
      severity,
      durationMinutes,
      additionalNotes,
      createdAt: new Date().toISOString(),
    };

    saveLog(logEntry);
    Alert.alert('Success', '🌊 Meltdown log saved!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 1: Mood at Event <Text style={styles.required}>*</Text></Text>
            <Text style={styles.stepSubtitle}>How were they feeling?</Text>
            <View style={styles.optionsGrid}>
              {moodOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.gridOption,
                    moodAtEvent === option.value && styles.gridOptionSelected,
                  ]}
                  onPress={() => setMoodAtEvent(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.gridEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.gridLabel,
                      moodAtEvent === option.value && styles.gridLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 2: Triggers <Text style={styles.required}>*</Text></Text>
            <Text style={styles.stepSubtitle}>What might have caused it? (Select all that apply)</Text>
            {suggestedTriggersFromProfile.length > 0 && (
              <View style={styles.suggestedTriggersHint}>
                <Text style={styles.suggestedTriggersHintText}>
                  ✨ Based on known triggers from {activeChild?.name}&apos;s profile
                </Text>
              </View>
            )}
            <View style={styles.triggerList}>
              {sortedTriggerOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.triggerOption,
                    triggers.includes(option.value) && styles.triggerOptionSelected,
                    option.suggested && styles.triggerSuggested,
                  ]}
                  onPress={() => toggleTrigger(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.triggerContent}>
                    <Text style={styles.triggerEmoji}>{option.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.triggerLabel,
                          triggers.includes(option.value) && styles.triggerLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.suggested && (
                        <Text style={styles.suggestedLabel}>Known trigger</Text>
                      )}
                    </View>
                  </View>
                  {triggers.includes(option.value) && (
                    <View style={styles.checkmark}>
                      <Check size={16} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 3: Severity <Text style={styles.required}>*</Text></Text>
            <Text style={styles.stepSubtitle}>How intense was the meltdown?</Text>
            <View style={styles.severityOptions}>
              {severityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.severityOption,
                    severity === option.value && {
                      backgroundColor: option.color + '20',
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => setSeverity(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.severityEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.severityLabel,
                      severity === option.value && { color: option.color, fontWeight: '600' as const },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 4: Duration <Text style={styles.required}>*</Text></Text>
            <Text style={styles.stepSubtitle}>How long did it last?</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>{durationMinutes} minutes</Text>
              <CustomSlider
                style={styles.slider}
                minimumValue={1}
                maximumValue={60}
                step={1}
                value={durationMinutes}
                onValueChange={setDurationMinutes}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.primary}
              />
              <View style={styles.sliderRange}>
                <Text style={styles.sliderRangeText}>1 min</Text>
                <Text style={styles.sliderRangeText}>60 min</Text>
              </View>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 5: Additional Notes</Text>
            <Text style={styles.stepSubtitle}>
              Details about what happened, what helped, observations
            </Text>
            <TextInput
              style={styles.textArea}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              placeholder="Share any additional context or observations..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          {currentStep === 1 ? (
            <X size={24} color={Colors.text} />
          ) : (
            <ArrowLeft size={24} color={Colors.text} />
          )}
        </TouchableOpacity>
        <Text style={styles.title}>Meltdown Log</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>{currentStep}/5</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / 5) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {currentStep < 5 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canGoNext() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canGoNext()}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, !canGoNext() && styles.nextButtonTextDisabled]}>
              Next Step
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, !canGoNext() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canGoNext()}
            activeOpacity={0.8}
          >
            <Check size={20} color={Colors.background} />
            <Text style={[styles.saveButtonText, !canGoNext() && styles.saveButtonTextDisabled]}>
              Save Meltdown Log
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '20',
    borderRadius: 12,
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surface,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  required: {
    color: '#F44336',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridOption: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  gridOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  gridEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  gridLabelSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  triggerList: {
    gap: 12,
  },
  triggerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  triggerOptionSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triggerEmoji: {
    fontSize: 24,
  },
  triggerLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  triggerLabelSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityOptions: {
    gap: 12,
  },
  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  severityEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  severityLabel: {
    fontSize: 18,
    color: Colors.text,
  },
  sliderContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sliderLabel: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderRangeText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 150,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  nextButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  saveButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  triggerSuggested: {
    borderWidth: 2,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '08',
  },
  suggestedTriggersHint: {
    backgroundColor: Colors.primary + '15',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  suggestedTriggersHintText: {
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  suggestedLabel: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
});
