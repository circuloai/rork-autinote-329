import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';

export default function CalendarScreen() {
  const router = useRouter();
  const { activeChildLogs } = useApp();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);

  const logsByDate = activeChildLogs.reduce((acc, log) => {
    const dateKey = new Date(log.date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, any[]>);
  
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const goToToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const getMoodColor = (rating: string) => {
    switch (rating) {
      case 'good': return Colors.success;
      case 'mixed': return Colors.warning;
      case 'challenging': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const renderCalendar = () => {
    const days = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < dayLabels.length; i++) {
      days.push(
        <View key={`label-${i}`} style={styles.dayLabel}>
          <Text style={styles.dayLabelText}>{dayLabels[i]}</Text>
        </View>
      );
    }

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateKey = date.toDateString();
      const logsForDay = logsByDate[dateKey] || [];
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;
      const firstLog = logsForDay[0];
      const hasMultipleLogs = logsForDay.length > 1;

      days.push(
        <TouchableOpacity 
          key={`day-${day}`} 
          style={styles.dayCell}
          onPress={() => {
            const selectedDate = new Date(selectedYear, selectedMonth, day);
            router.push({
              pathname: '/log/daily' as any,
              params: { date: selectedDate.toISOString() }
            });
          }}
          activeOpacity={0.7}
        >
          <View style={[
            styles.dayContent,
            isToday && styles.today,
            firstLog && { backgroundColor: getMoodColor((firstLog as any).overallRating || (firstLog as any).moodRating) }
          ]}>
            <Text style={[
              styles.dayText,
              isToday && styles.todayText,
              firstLog && styles.loggedDayText
            ]}>
              {day}
            </Text>
            {hasMultipleLogs && (
              <View style={styles.multipleIndicator}>
                <Text style={styles.multipleIndicatorText}>{logsForDay.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Calendar',
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
        }}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
            <Text style={styles.monthYear}>
              {getMonthName(selectedMonth)} {selectedYear}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <ChevronRight size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {renderCalendar()}
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Mood Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendText}>Mixed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>Challenging</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYear: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  dayLabel: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayLabelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  today: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 16,
    color: Colors.text,
  },
  todayText: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  loggedDayText: {
    color: Colors.background,
    fontWeight: '600' as const,
  },
  legend: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  multipleIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.background,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  multipleIndicatorText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
