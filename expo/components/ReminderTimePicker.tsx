import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, Clock } from 'lucide-react-native';
import ScaledText from '@/components/ScaledText';
import { formatReminderTime, toStoredReminderTime } from '@/lib/reminderUtils';
import { getColors } from '@/constants/colors';

type AppColors = ReturnType<typeof getColors>;

interface ReminderTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  colors: AppColors;
  label?: string;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const value = toStoredReminderTime(hours12, minute, period);
  return { value, label: formatReminderTime(value) };
});

export default function ReminderTimePicker({ value, onChange, colors, label }: ReminderTimePickerProps) {
  const [visible, setVisible] = useState(false);
  const displayValue = useMemo(() => formatReminderTime(value), [value]);

  return (
    <>
      {label && <ScaledText style={[styles.label, { color: colors.text }]}>{label}</ScaledText>}
      <TouchableOpacity
        style={[
          styles.control,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${displayValue}` : `Reminder time: ${displayValue}`}
      >
        <Clock size={17} color={colors.textSecondary} />
        <ScaledText style={[styles.value, { color: colors.text }]}>{displayValue}</ScaledText>
        <ChevronDown size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { backgroundColor: colors.background }]}
            onPress={() => undefined}
          >
            <View style={styles.sheetHeader}>
              <ScaledText style={[styles.sheetTitle, { color: colors.text }]}>
                Choose a time
              </ScaledText>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close time picker"
              >
                <ScaledText style={[styles.closeText, { color: colors.primary }]}>Done</ScaledText>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.options}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {TIME_OPTIONS.map((option) => {
                const selected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      selected && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
                    ]}
                    onPress={() => {
                      onChange(option.value);
                      setVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <ScaledText style={[styles.optionText, { color: selected ? colors.primary : colors.text }]}>
                      {option.label}
                    </ScaledText>
                    {selected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  control: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 14,
  },
  value: {
    flex: 1,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  options: {
    flexGrow: 0,
  },
  optionsContent: {
    gap: 8,
    paddingBottom: 8,
  },
  option: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});