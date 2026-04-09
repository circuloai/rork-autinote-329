import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Save, Edit2, User, GraduationCap, Heart, AlertCircle, Sparkles } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, profile, saveProfile, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedChild, setEditedChild] = useState(activeChild);

  const handleSave = () => {
    if (!profile || !editedChild) return;

    const updatedProfile = {
      ...profile,
      children: profile.children.map(child => 
        child.id === editedChild.id ? editedChild : child
      ),
    };

    saveProfile(updatedProfile);
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  if (!activeChild) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Text>No child profile found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Child Profile</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Edit2 size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Save size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <User size={48} color={Colors.primary} />
          </View>
          <Text style={styles.profileName}>{activeChild.name}</Text>
          <Text style={styles.profileAge}>Age {activeChild.age}</Text>
        </View>

        <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
          <View style={styles.cardHeader}>
            <GraduationCap size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Basic Information</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedChild?.name || ''}
                onChangeText={(text) => setEditedChild(prev => prev ? {...prev, name: text} : null)}
                placeholder="Child's name"
                placeholderTextColor={Colors.textLight}
              />
            ) : (
              <Text style={styles.infoValue}>{activeChild.name}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Age</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedChild?.age.toString() || ''}
                onChangeText={(text) => {
                  const age = parseInt(text) || 0;
                  setEditedChild(prev => prev ? {...prev, age} : null);
                }}
                placeholder="Age"
                keyboardType="number-pad"
                placeholderTextColor={Colors.textLight}
              />
            ) : (
              <Text style={styles.infoValue}>{activeChild.age}</Text>
            )}
          </View>

          {(activeChild.diagnosis || isEditing) && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Diagnosis</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedChild?.diagnosis || ''}
                  onChangeText={(text) => setEditedChild(prev => prev ? {...prev, diagnosis: text} : null)}
                  placeholder="e.g., Autism Spectrum Disorder"
                  placeholderTextColor={Colors.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{activeChild.diagnosis}</Text>
              )}
            </View>
          )}

          {(activeChild.gradeLevel || isEditing) && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Grade Level</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedChild?.gradeLevel || ''}
                  onChangeText={(text) => setEditedChild(prev => prev ? {...prev, gradeLevel: text} : null)}
                  placeholder="e.g., 3rd Grade"
                  placeholderTextColor={Colors.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{activeChild.gradeLevel}</Text>
              )}
            </View>
          )}

          {(activeChild.schoolName || isEditing) && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>School Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedChild?.schoolName || ''}
                  onChangeText={(text) => setEditedChild(prev => prev ? {...prev, schoolName: text} : null)}
                  placeholder="School name"
                  placeholderTextColor={Colors.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{activeChild.schoolName}</Text>
              )}
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
          <View style={styles.cardHeader}>
            <AlertCircle size={24} color={Colors.secondary} />
            <Text style={styles.cardTitle}>Known Triggers</Text>
          </View>
          <View style={styles.chipsContainer}>
            {activeChild.commonTriggers.map((trigger: string, idx: number) => (
              <View key={idx} style={styles.chip}>
                <Text style={styles.chipText}>{trigger}</Text>
              </View>
            ))}
            {activeChild.commonTriggers.length === 0 && (
              <Text style={styles.emptyText}>No triggers recorded yet</Text>
            )}
          </View>
          <Text style={styles.helperText}>
            These triggers help personalize your journaling experience and AI insights
          </Text>
        </GlassCard>

        {(activeChild.strengths && activeChild.strengths.length > 0) && (
          <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.cardHeader}>
              <Heart size={24} color={Colors.primary} />
              <Text style={styles.cardTitle}>Strengths</Text>
            </View>
            <View style={styles.chipsContainer}>
              {activeChild.strengths.map((strength: string, idx: number) => (
                <View key={idx} style={[styles.chip, styles.strengthChip]}>
                  <Text style={[styles.chipText, styles.strengthChipText]}>{strength}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {(activeChild.interests && activeChild.interests.length > 0) && (
          <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.cardHeader}>
              <Sparkles size={24} color={Colors.secondary} />
              <Text style={styles.cardTitle}>Interests</Text>
            </View>
            <View style={styles.chipsContainer}>
              {activeChild.interests.map((interest: string, idx: number) => (
                <View key={idx} style={[styles.chip, styles.interestChip]}>
                  <Text style={[styles.chipText, styles.interestChipText]}>{interest}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        <View style={styles.explainerCard}>
          <Text style={styles.explainerTitle}>How this profile customizes your experience</Text>
          <View style={styles.explainerItem}>
            <Text style={styles.explainerBullet}>•</Text>
            <Text style={styles.explainerText}>
              <Text style={styles.explainerBold}>Diagnosis</Text> helps tailor tag suggestions and AI insights
            </Text>
          </View>
          <View style={styles.explainerItem}>
            <Text style={styles.explainerBullet}>•</Text>
            <Text style={styles.explainerText}>
              <Text style={styles.explainerBold}>Triggers</Text> appear as quick-select options in meltdown logs
            </Text>
          </View>
          <View style={styles.explainerItem}>
            <Text style={styles.explainerBullet}>•</Text>
            <Text style={styles.explainerText}>
              <Text style={styles.explainerBold}>School info</Text> enables home vs. school behavior comparison
            </Text>
          </View>
          <View style={styles.explainerItem}>
            <Text style={styles.explainerBullet}>•</Text>
            <Text style={styles.explainerText}>
              <Text style={styles.explainerBold}>Age</Text> adjusts AI responses and suggestions appropriately
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) => StyleSheet.create({
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
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  chipText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '500' as const,
  },
  strengthChip: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '40',
  },
  strengthChipText: {
    color: Colors.primary,
  },
  interestChip: {
    backgroundColor: Colors.accent + '15',
    borderColor: Colors.accent + '40',
  },
  interestChipText: {
    color: Colors.accent,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
    fontStyle: 'italic' as const,
  },
  explainerCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  explainerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  explainerItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 12,
  },
  explainerBullet: {
    fontSize: 16,
    color: Colors.primary,
    marginRight: 8,
    fontWeight: '700' as const,
  },
  explainerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  explainerBold: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
