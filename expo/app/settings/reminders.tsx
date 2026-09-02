import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Modal, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, X, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import ScaledText from '@/components/ScaledText';
import ReminderTimePicker from '@/components/ReminderTimePicker';
import { useApp } from '@/contexts/AppContext';
import type { QuickReminder, CustomReminder, ReminderCategory, ReminderTone, ReminderRepeat } from '@/types';
import { REMINDER_WEEKDAYS, formatReminderTime, formatRepeatLabel } from '@/lib/reminderUtils';
import { syncReminderNotifications } from '@/lib/notifications';
import { getColors } from '@/constants/colors';

export default function RemindersSettingsScreen() {
  const router = useRouter();
  const { preferences, savePreferences } = useApp();
  const Colors = useColors(preferences);
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
  const [newReminderTime, setNewReminderTime] = useState('09:00');
  const [newReminderRepeat, setNewReminderRepeat] = useState<ReminderRepeat>('daily');
  const [newReminderCustomDays, setNewReminderCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newReminderTone, setNewReminderTone] = useState<ReminderTone>('chime');
  const [newReminderMessage, setNewReminderMessage] = useState('Would you like to log today notes?');
  const [isSaving, setIsSaving] = useState(false);

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

  const updateQuickReminderTime = (id: string, storedTime: string) => {
    setQuickReminders(prev => prev.map(r => 
      r.id === id ? { ...r, time: storedTime } : r
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
      customDays: newReminderRepeat === 'custom' ? newReminderCustomDays : undefined,
      tone: newReminderTone,
      message: newReminderMessage,
      enabled: true,
    };
    
    setCustomReminders(prev => [...prev, reminder]);
    setShowReminderModal(false);
    setNewReminderLabel('');
    setNewReminderTime('09:00');
    setNewReminderRepeat('daily');
    setNewReminderCustomDays([1, 2, 3, 4, 5]);
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

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    
    const hasAnyEnabled = quickReminders.some(r => r.enabled) || customReminders.some(r => r.enabled);
    const updatedPreferences = {
      ...preferences,
      reminders: hasAnyEnabled,
      quickReminders,
      customReminders,
    };
    
    savePreferences(updatedPreferences);
    const syncResult = await syncReminderNotifications(quickReminders, customReminders);
    setIsSaving(false);

    if (!syncResult.success) {
      const message = syncResult.reason === 'permission-denied'
        ? 'Your settings were saved, but notifications are turned off. Enable notifications for AutiNote in your device settings to receive reminders.'
        : syncResult.reason === 'unsupported'
          ? 'Your settings were saved. Device notifications are available in the iOS and Android apps.'
          : 'Your settings were saved, but the reminders could not be scheduled. Please try again.';
      Alert.alert('Notifications unavailable', message, [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }

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
          <ScaledText style={styles.sectionTitle}>Quick Option Buttons</ScaledText>
          <ScaledText style={styles.sectionDesc}>
            Enable reminders for common logging times throughout your day
          </ScaledText>
          
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
                      <ScaledText style={styles.reminderTitle}>{config.title}</ScaledText>
                    </View>
                    <ScaledText style={styles.reminderDesc}>{config.desc}</ScaledText>
                    <ScaledText style={styles.reminderTime}>{config.time}</ScaledText>
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
                    <ReminderTimePicker
                      value={reminder.time || '08:00'}
                      onChange={(time) => updateQuickReminderTime(reminder.id, time)}
                      colors={Colors}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>Custom Reminders</ScaledText>
          <ScaledText style={styles.sectionDesc}>
            Create personalized reminders for specific activities or times
          </ScaledText>
          
          <TouchableOpacity
            style={styles.createReminderButton}
            onPress={() => setShowReminderModal(true)}
            activeOpacity={0.7}
          >
            <ScaledText style={styles.createReminderText}>Create Custom Reminder</ScaledText>
            <ArrowRight size={18} color={Colors.primary} />
          </TouchableOpacity>

          {customReminders.length > 0 && (
            <View style={styles.customRemindersPreview}>
              {customReminders.map((reminder) => (
                <View key={reminder.id} style={styles.customReminderCard}>
                  <View style={styles.customReminderHeader}>
                    <View style={styles.customReminderInfo}>
                      <ScaledText style={styles.customReminderLabel}>{reminder.label}</ScaledText>
                      <ScaledText style={styles.customReminderTime}>
                        {formatReminderTime(reminder.time)} • {formatRepeatLabel(reminder.repeat, reminder.customDays)} • {reminder.category}
                      </ScaledText>
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
                    <ScaledText style={styles.deleteButtonText}>Delete</ScaledText>
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
              <ScaledText style={styles.infoTitle}>Active Reminders</ScaledText>
              <ScaledText style={styles.infoText}>
                You have {quickReminders.filter(r => r.enabled).length + customReminders.filter(r => r.enabled).length} reminder(s) enabled.
                Make sure notifications are enabled in your device settings.
              </ScaledText>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <ScaledText style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save Changes'}</ScaledText>
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
            <ScaledText style={styles.modalTitle}>Create Custom Reminder</ScaledText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalInputGroup}>
              <ScaledText style={styles.label}>Reminder Name *</ScaledText>
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
              <ScaledText style={styles.label}>Category</ScaledText>
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
                    <ScaledText
                      style={[
                        styles.categoryText,
                        newReminderCategory === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </ScaledText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <ReminderTimePicker
                value={newReminderTime}
                onChange={setNewReminderTime}
                colors={Colors}
                label="Time *"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <ScaledText style={styles.label}>Repeat</ScaledText>
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
                    <ScaledText
                      style={[
                        styles.repeatText,
                        newReminderRepeat === rep && styles.repeatTextActive,
                      ]}
                    >
                      {rep.charAt(0).toUpperCase() + rep.slice(1)}
                    </ScaledText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {newReminderRepeat === 'custom' && (
              <View style={styles.modalInputGroup}>
                <ScaledText style={styles.label}>Choose days</ScaledText>
                <View style={styles.dayGrid}>
                  {REMINDER_WEEKDAYS.map((day) => {
                    const selected = newReminderCustomDays.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[styles.dayButton, selected && styles.dayButtonActive]}
                        onPress={() => setNewReminderCustomDays((current) =>
                          selected ? current.filter((value) => value !== day.value) : [...current, day.value],
                        )}
                        activeOpacity={0.7}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <ScaledText style={[styles.dayText, selected && styles.dayTextActive]}>
                          {day.shortLabel}
                        </ScaledText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {newReminderCustomDays.length === 0 && (
                  <ScaledText style={styles.validationText}>Choose at least one day.</ScaledText>
                )}
              </View>
            )}

            <View style={styles.modalInputGroup}>
              <ScaledText style={styles.label}>Tone</ScaledText>
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
                    <ScaledText
                      style={[
                        styles.toneText,
                        newReminderTone === tone.value && styles.toneTextActive,
                      ]}
                    >
                      {tone.label}
                    </ScaledText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <ScaledText style={styles.label}>Notification Message</ScaledText>
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
              <ScaledText style={styles.modalCancelText}>Cancel</ScaledText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                !newReminderLabel.trim() && styles.modalSaveButtonDisabled,
              ]}
              onPress={addCustomReminder}
              disabled={!newReminderLabel.trim() || (newReminderRepeat === 'custom' && newReminderCustomDays.length === 0)}
              activeOpacity={0.7}
            >
              <ScaledText style={styles.modalSaveText}>Add Reminder</ScaledText>
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
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    minWidth: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  dayButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dayTextActive: {
    color: Colors.primary,
  },
  validationText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.error,
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
