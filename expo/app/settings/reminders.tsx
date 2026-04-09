import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Modal, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, Clock, X, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { QuickReminder, CustomReminder, ReminderCategory, ReminderTone, ReminderRepeat } from '@/types';

function formatTo12h(time24: string): string {
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

function parseTo24h(time12: string): string {
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

export default function RemindersSettingsScreen() {
  const router = useRouter();
  const { preferences, savePreferences } = useApp();
  const Colors = useMemo(() => getColors(preferences || undefined), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [quickReminders, setQuickReminders] = useState<QuickReminder[]>(
    preferences?.quickReminders || [
      { id: '1', type: 'morning', enabled: false, time: '07:00' },
      { id: '2', type: 'afternoon', enabled: false, time: '13:00' },
      { id: '3', type: 'evening', enabled: false, time: '20:00' },
      { id: '4', type: 'sleep', enabled: false, time: '21:30' },
    ]
  );
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>(
    preferences?.customReminders || []
  );
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminderLabel, setNewReminderLabel] = useState('');
  const [newReminderCategory, setNewReminderCategory] = useState<ReminderCategory>('mood');
  const [newReminderTime, setNewReminderTime] = useState('9:00 AM');
  const [newReminderRepeat, setNewReminderRepeat] = useState<ReminderRepeat>('daily');
  const [newReminderTone, setNewReminderTone] = useState<ReminderTone>('chime');
  const [newReminderMessage, setNewReminderMessage] = useState('Would you like to log today notes?');

  useEffect(() => {
    if (preferences?.quickReminders) {
      setQuickReminders(preferences.quickReminders);
    }
    if (preferences?.customReminders) {
      setCustomReminders(preferences.customReminders);
    }
  }, [preferences?.quickReminders, preferences?.customReminders]);

  const toggleQuickReminder = (id: string) => {
    setQuickReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const updateQuickReminderTime = (id: string, displayTime: string) => {
    const stored = parseTo24h(displayTime);
    setQuickReminders(prev => prev.map(r => 
      r.id === id ? { ...r, time: stored } : r
    ));
  };

  const addCustomReminder = () => {
    if (!newReminderLabel.trim()) return;
    
    const reminder: CustomReminder = {
      id: Date.now().toString(),
      label: newReminderLabel,
      category: newReminderCategory,
      time: parseTo24h(newReminderTime),
      repeat: newReminderRepeat,
      tone: newReminderTone,
      message: newReminderMessage,
      enabled: true,
    };
    
    setCustomReminders(prev => [...prev, reminder]);
    setShowReminderModal(false);
    setNewReminderLabel('');
    setNewReminderTime('9:00 AM');
    setNewReminderMessage('Would you like to log today notes?');
  };

  const removeCustomReminder = (id: string) => {
    setCustomReminders(prev => prev.filter(r => r.id !== id));
  };

  const toggleCustomReminder = (id: string) => {
    setCustomReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const handleSave = () => {
    if (!preferences) return;
    
    const hasAnyEnabled = quickReminders.some(r => r.enabled) || customReminders.some(r => r.enabled);
    
    savePreferences({
      theme: preferences.theme,
      colorTheme: preferences.colorTheme,
      fontSize: preferences.fontSize,
      textToSpeech: preferences.textToSpeech,
      reminders: hasAnyEnabled,
      reminderTime: preferences.reminderTime,
      quickReminders,
      customReminders,
    });
    
    Alert.alert('Saved', 'Your reminder preferences have been saved successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Reminders',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Option Buttons</Text>
          <Text style={styles.sectionDesc}>
            Enable reminders for common logging times throughout your day
          </Text>
          
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
                      value={formatTo12h(reminder.time ?? '')}
                      onChangeText={(text) => updateQuickReminderTime(reminder.id, text)}
                      placeholder="12:00 AM"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="default"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Reminders</Text>
          <Text style={styles.sectionDesc}>
            Create personalized reminders for specific activities or times
          </Text>
          
          <TouchableOpacity
            style={styles.createReminderButton}
            onPress={() => setShowReminderModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.createReminderText}>Create Custom Reminder</Text>
            <ArrowRight size={18} color={Colors.primary} />
          </TouchableOpacity>

          {customReminders.length > 0 && (
            <View style={styles.customRemindersPreview}>
              {customReminders.map((reminder) => (
                <View key={reminder.id} style={styles.customReminderCard}>
                  <View style={styles.customReminderHeader}>
                    <View style={styles.customReminderInfo}>
                      <Text style={styles.customReminderLabel}>{reminder.label}</Text>
                      <Text style={styles.customReminderTime}>
                        {formatTo12h(reminder.time)} • {reminder.repeat} • {reminder.category}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggle, reminder.enabled && styles.toggleActive]}
                      onPress={() => toggleCustomReminder(reminder.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toggleCircle, reminder.enabled && styles.toggleCircleActive]} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => removeCustomReminder(reminder.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {(quickReminders.some(r => r.enabled) || customReminders.some(r => r.enabled)) && (
          <View style={styles.infoSection}>
            <CheckCircle2 size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Active Reminders</Text>
              <Text style={styles.infoText}>
                You have {quickReminders.filter(r => r.enabled).length + customReminders.filter(r => r.enabled).length} reminder(s) enabled.
                Make sure notifications are enabled in your device settings.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

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
            <Text style={styles.modalTitle}>Create Custom Reminder</Text>
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
                placeholder="12:00 AM"
                placeholderTextColor={Colors.textLight}
                keyboardType="default"
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
                {[
                  { value: 'chime' as const, label: 'Gentle chime 🎵' },
                  { value: 'silent' as const, label: 'Silent notification 🔕' },
                  { value: 'text' as const, label: 'Text only 💬' },
                ].map((tone) => (
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
              <Text style={styles.modalSaveText}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  reminderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
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
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    marginTop: 16,
    gap: 12,
  },
  customReminderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  customReminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customReminderInfo: {
    flex: 1,
  },
  customReminderLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  customReminderTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: Colors.error + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
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
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
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
});
