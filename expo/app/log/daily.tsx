import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Sparkles } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import CustomSlider from '@/components/CustomSlider';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { DailyMoodRating, MoodTag, DailyLogEntry } from '@/types';
import { generateText } from '@rork-ai/toolkit-sdk';

export default function DailyLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  const { activeChild, saveLog, activeChildLogs } = useApp();
  
  const selectedDate = params.date ? new Date(params.date) : new Date();
  
  const existingLogsForDate = activeChildLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.toDateString() === selectedDate.toDateString();
  });

  const [overallRating, setOverallRating] = useState<DailyMoodRating | null>(null);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatWasChallenging, setWhatWasChallenging] = useState('');
  const [selectedTags, setSelectedTags] = useState<MoodTag[]>([]);
  const [sleepHours, setSleepHours] = useState<number>(8);
  
  const [wellSuggestions, setWellSuggestions] = useState<string[]>([]);
  const [challengeSuggestions, setChallengeSuggestions] = useState<string[]>([]);
  const [isGeneratingWell, setIsGeneratingWell] = useState(false);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const wellTextInputRef = useRef<View>(null);
  const challengeTextInputRef = useRef<View>(null);

  const moodOptions: { value: DailyMoodRating; label: string; emoji: string; color: string }[] = [
    { value: 'great', label: 'Great Day', emoji: '😊', color: '#4CAF50' },
    { value: 'mixed', label: 'Mixed Day', emoji: '😐', color: '#FF9800' },
    { value: 'challenging', label: 'Challenging Day', emoji: '😔', color: '#F44336' },
  ];

  const getSuggestedTags = (): MoodTag[] => {
    if (!activeChild?.diagnosis) return [];
    const diagnosis = activeChild.diagnosis.toLowerCase();
    
    if (diagnosis.includes('adhd') || diagnosis.includes('attention')) {
      return ['focused', 'anxious', 'frustrated', 'tired'];
    }
    if (diagnosis.includes('autism') || diagnosis.includes('asd')) {
      return ['sensory', 'anxious', 'calm', 'social'];
    }
    return [];
  };

  const suggestedTags = getSuggestedTags();

  const moodTagOptions: { value: MoodTag; emoji: string; label: string; suggested?: boolean }[] = [
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'calm', emoji: '🍃', label: 'Calm', suggested: suggestedTags.includes('calm') },
    { value: 'anxious', emoji: '☁️', label: 'Anxious', suggested: suggestedTags.includes('anxious') },
    { value: 'frustrated', emoji: '🔥', label: 'Frustrated', suggested: suggestedTags.includes('frustrated') },
    { value: 'focused', emoji: '🎯', label: 'Focused', suggested: suggestedTags.includes('focused') },
    { value: 'social', emoji: '👥', label: 'Social', suggested: suggestedTags.includes('social') },
    { value: 'sensory', emoji: '🔊', label: 'Sensory', suggested: suggestedTags.includes('sensory') },
    { value: 'tired', emoji: '😴', label: 'Tired', suggested: suggestedTags.includes('tired') },
  ];

  const sortedMoodTagOptions = [
    ...moodTagOptions.filter(opt => opt.suggested),
    ...moodTagOptions.filter(opt => !opt.suggested),
  ];

  const predefinedWellSuggestions = [
    'Good eye contact',
    'Calm and happy mood',
    'Played well with others',
    'Shared toys',
    'Expressed needs clearly',
    'Tried new word or phrase',
    'Participated in group activity',
    'Gave a hug or showed affection',
    'Completed therapy tasks',
    'Followed instructions',
    'Paid attention during class',
    'Improved concentration',
    'Finished homework or learning activity',
    'Tried something new',
    'Transitioned smoothly',
    'Waited patiently',
    'Used calming strategy independently',
    'No meltdowns today',
    'Stayed regulated during outing',
    'Ate full meal',
    'Tried new food',
    'Brushed teeth or dressed independently',
    'Slept well last night',
    'Enjoyed music or sensory play',
    'Played creatively',
    'Handled noise or lights better',
  ];

  const predefinedChallengeSuggestions = [
    'Meltdown or tantrum',
    'Aggressive behavior',
    'Frustration with transitions',
    'Refused task or instruction',
    'Hyperactivity',
    'Difficulty calming down',
    'Overstimulation (noise, lights, textures)',
    'Crowded environment',
    'Unfamiliar place',
    'Unexpected change in schedule',
    'Clothing discomfort',
    'Food texture sensitivity',
    'Difficulty focusing',
    'Trouble following instructions',
    'Inattentive during therapy or class',
    'Distracted easily',
    'Trouble expressing needs',
    'Avoided social interaction',
    'Misunderstood cues',
    "Didn't want to engage",
    'Poor appetite',
    'Refused to eat',
    'Trouble sleeping',
    'Refused hygiene routine',
    'School stress',
    'Change in therapist or caregiver',
    'Weather or travel disruption',
    'Fatigue',
  ];

  const generateSuggestionsForWell = async (text: string) => {
    const lastCommaIndex = text.lastIndexOf(',');
    const currentInput = lastCommaIndex >= 0 ? text.substring(lastCommaIndex + 1).trim() : text.trim();

    if (currentInput.length < 2) {
      setWellSuggestions([]);
      return;
    }

    setIsGeneratingWell(true);
    try {
      const prompt = `A parent is logging their autistic child's daily progress. They started typing: "${currentInput}"

Suggest 3 completions or related positive moments from this list. Match their typing context. Return only the suggestions, one per line:

${predefinedWellSuggestions.join('\n')}`;
      
      const response = await generateText(prompt);
      const suggestions = response
        .split('\n')
        .map(s => s.trim().replace(/^[-*•\d.]+\s*/, ''))
        .filter(s => s.length > 0 && s.length < 100)
        .slice(0, 3);
      
      setWellSuggestions(suggestions.length > 0 ? suggestions : predefinedWellSuggestions.slice(0, 3));
    } catch (error) {
      console.error('Error generating suggestions:', error);
      const filtered = predefinedWellSuggestions.filter(s => 
        s.toLowerCase().includes(currentInput.toLowerCase())
      ).slice(0, 3);
      setWellSuggestions(filtered.length > 0 ? filtered : predefinedWellSuggestions.slice(0, 3));
    } finally {
      setIsGeneratingWell(false);
    }
  };

  const generateSuggestionsForChallenge = async (text: string) => {
    const lastCommaIndex = text.lastIndexOf(',');
    const currentInput = lastCommaIndex >= 0 ? text.substring(lastCommaIndex + 1).trim() : text.trim();

    if (currentInput.length < 2) {
      setChallengeSuggestions([]);
      return;
    }

    setIsGeneratingChallenge(true);
    try {
      const prompt = `A parent is logging their autistic child's challenges. They started typing: "${currentInput}"

Suggest 3 completions or related challenges from this list. Match their typing context. Return only the suggestions, one per line:

${predefinedChallengeSuggestions.join('\n')}`;
      
      const response = await generateText(prompt);
      const suggestions = response
        .split('\n')
        .map(s => s.trim().replace(/^[-*•\d.]+\s*/, ''))
        .filter(s => s.length > 0 && s.length < 100)
        .slice(0, 3);
      
      setChallengeSuggestions(suggestions.length > 0 ? suggestions : predefinedChallengeSuggestions.slice(0, 3));
    } catch (error) {
      console.error('Error generating suggestions:', error);
      const filtered = predefinedChallengeSuggestions.filter(s => 
        s.toLowerCase().includes(currentInput.toLowerCase())
      ).slice(0, 3);
      setChallengeSuggestions(filtered.length > 0 ? filtered : predefinedChallengeSuggestions.slice(0, 3));
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const toggleTag = (tag: MoodTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    if (!overallRating) {
      Alert.alert('Missing Information', 'Please select an overall rating');
      return;
    }

    if (!activeChild) {
      Alert.alert('Error', 'No active child profile');
      return;
    }

    const logEntry: DailyLogEntry = {
      id: Crypto.randomUUID(),
      childId: activeChild.id,
      date: selectedDate.toISOString(),
      type: 'daily',
      overallRating,
      whatWentWell,
      whatWasChallenging,
      moodTags: selectedTags,
      sleepHours,
      createdAt: new Date().toISOString(),
    };

    saveLog(logEntry);
    Alert.alert('Success', '📝 Daily log saved!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Daily Log</Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Check size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
        {existingLogsForDate.length > 0 && (
          <View style={styles.existingLogsNotice}>
            <Text style={styles.existingLogsText}>
              ℹ️ {existingLogsForDate.length} {existingLogsForDate.length === 1 ? 'entry' : 'entries'} already logged for this date
            </Text>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating <Text style={styles.required}>*</Text></Text>
          <View style={styles.moodOptionsHorizontal}>
            {moodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.moodOptionCompact,
                  overallRating === option.value && {
                    backgroundColor: option.color + '20',
                    borderColor: option.color,
                  },
                ]}
                onPress={() => setOverallRating(option.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmojiCompact}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabelCompact,
                    overallRating === option.value && { color: option.color, fontWeight: '600' as const },
                  ]}
                >
                  {option.label.replace(' Day', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Tags</Text>
          <View style={styles.tags}>
            {sortedMoodTagOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.tag,
                  selectedTags.includes(option.value) && styles.tagSelected,
                  option.suggested && styles.tagSuggested,
                ]}
                onPress={() => toggleTag(option.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.tagEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(option.value) && styles.tagTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{sleepHours} hours</Text>
            <CustomSlider
              style={styles.slider}
              minimumValue={1}
              maximumValue={12}
              step={0.5}
              value={sleepHours}
              onValueChange={setSleepHours}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.sliderRangeText}>1h</Text>
              <Text style={styles.sliderRangeText}>12h</Text>
            </View>
          </View>
        </View>

        <View style={styles.section} ref={wellTextInputRef}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>What went well today?</Text>
              <Text style={styles.sectionSubtitle}>Positive moments, achievements, happy experiences</Text>
            </View>
            {isGeneratingWell && (
              <View style={styles.loadingIndicator}>
                <Sparkles size={16} color={Colors.primary} />
              </View>
            )}
          </View>
          {wellSuggestions.length > 0 && (
            <View style={styles.suggestionsChips}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {wellSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setWhatWentWell(prev => {
                        const lastCommaIndex = prev.lastIndexOf(',');
                        if (lastCommaIndex >= 0) {
                          return `${prev.substring(0, lastCommaIndex)}, ${suggestion}`;
                        }
                        return suggestion;
                      });
                      setWellSuggestions([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Sparkles size={12} color={Colors.primary} />
                    <Text style={styles.suggestionChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <TextInput
            style={styles.textArea}
            value={whatWentWell}
            onChangeText={(text) => {
              setWhatWentWell(text);
              generateSuggestionsForWell(text);
            }}
            onFocus={() => {
              setTimeout(() => {
                wellTextInputRef.current?.measureLayout(
                  scrollViewRef.current as any,
                  (x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                  },
                  () => {}
                );
              }, 100);
            }}
            placeholder="Start typing for AI suggestions..."
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section} ref={challengeTextInputRef}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>What was challenging?</Text>
              <Text style={styles.sectionSubtitle}>Difficulties, triggers, areas needing attention</Text>
            </View>
            {isGeneratingChallenge && (
              <View style={styles.loadingIndicator}>
                <Sparkles size={16} color={Colors.primary} />
              </View>
            )}
          </View>
          {challengeSuggestions.length > 0 && (
            <View style={styles.suggestionsChips}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {challengeSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setWhatWasChallenging(prev => {
                        const lastCommaIndex = prev.lastIndexOf(',');
                        if (lastCommaIndex >= 0) {
                          return `${prev.substring(0, lastCommaIndex)}, ${suggestion}`;
                        }
                        return suggestion;
                      });
                      setChallengeSuggestions([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Sparkles size={12} color={Colors.primary} />
                    <Text style={styles.suggestionChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <TextInput
            style={styles.textArea}
            value={whatWasChallenging}
            onChangeText={(text) => {
              setWhatWasChallenging(text);
              generateSuggestionsForChallenge(text);
            }}
            onFocus={() => {
              setTimeout(() => {
                challengeTextInputRef.current?.measureLayout(
                  scrollViewRef.current as any,
                  (x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                  },
                  () => {}
                );
              }, 100);
            }}
            placeholder="Start typing for AI suggestions..."
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  required: {
    color: '#F44336',
  },
  moodOptions: {
    gap: 12,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  moodEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  moodLabel: {
    fontSize: 18,
    color: Colors.text,
  },
  moodOptionsHorizontal: {
    flexDirection: 'row',
    gap: 8,
  },
  moodOptionCompact: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  moodEmojiCompact: {
    fontSize: 24,
    marginBottom: 6,
  },
  moodLabelCompact: {
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative' as const,
  },
  tagSuggested: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tagEmoji: {
    fontSize: 16,
  },
  tagSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: Colors.text,
  },
  tagTextSelected: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
  },
  sliderContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sliderLabel: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderRangeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  loadingIndicator: {
    padding: 8,
  },
  suggestionsChips: {
    marginBottom: 12,
    height: 40,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    marginRight: 8,
    height: 36,
  },
  suggestionChipText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  existingLogsNotice: {
    backgroundColor: Colors.primary + '15',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  existingLogsText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },

});
