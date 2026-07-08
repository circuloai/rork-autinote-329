import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScaledText from '@/components/ScaledText';
import { X, Save, Edit2, User, GraduationCap, Heart, AlertCircle, Sparkles } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/GlassCard';
import AvatarPicker from '@/components/AvatarPicker';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, profile, saveProfile, preferences } = useApp();
  const { user } = useAuth();
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

  const handleAvatarChange = useCallback(
    (value: string) => {
      if (!profile || !activeChild) return;
      const updatedProfile = {
        ...profile,
        children: profile.children.map((child) =>
          child.id === activeChild.id ? { ...child, avatar: value } : child
        ),
      };
      saveProfile(updatedProfile);
      setEditedChild((prev) => (prev ? { ...prev, avatar: value } : prev));
    },
    [profile, activeChild, saveProfile],
  );

  if (!activeChild) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <ScaledText>No child profile found</ScaledText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <ScaledText style={styles.title}>Child Profile</ScaledText>
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
          {user?.id ? (
            <AvatarPicker
              avatarValue={activeChild.avatar}
              onChangeAvatar={handleAvatarChange}
              uploadTarget={{ kind: 'child', userId: user.id, childId: activeChild.id }}
              size={100}
              colors={Colors}
              testID="child-avatar-picker"
            />
          ) : (
            <View style={styles.avatarLarge}>
              <User size={48} color={Colors.primary} />
            </View>
          )}
          <ScaledText style={styles.profileName}>{activeChild.name}</ScaledText>
          <ScaledText style={styles.profileAge}>Age {activeChild.age}</ScaledText>
        </View>

        <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
          <View style={styles.cardHeader}>
            <GraduationCap size={24} color={Colors.primary} />
            <ScaledText style={styles.cardTitle}>Basic Information</ScaledText>
          </View>
          
          <View style={styles.infoItem}>
            <ScaledText style={styles.infoLabel}>Name</ScaledText>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedChild?.name || ''}
                onChangeText={(text) => setEditedChild(prev => prev ? {...prev, name: text} : null)}
                placeholder="Child's name"
                placeholderTextColor={Colors.textLight}
              />
            ) : (
              <ScaledText style={styles.infoValue}>{activeChild.name}</ScaledText>
            )}
          </View>

          <View style={styles.infoItem}>
            <ScaledText style={styles.infoLabel}>Age</ScaledText>
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
              <ScaledText style={styles.infoValue}>{activeChild.age}</ScaledText>
            )}
          </View>

          {(activeChild.diagnosis || isEditing) && (
            <View style={styles.infoItem}>
              <ScaledText style={styles.infoLabel}>Diagnosis</ScaledText>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedChild?.diagnosis || ''}
                  onChangeText={(text) => setEditedChild(prev => prev ? {...prev, diagnosis: text} : null)}
                  placeholder="e.g., Autism Spectrum Disorder"
                  placeholderTextColor={Colors.textLight}
                />
              ) : (
                <ScaledText style={styles.infoValue}>{activeChild.diagnosis}</ScaledText>
              )}
            </View>
          )}

          {(activeChild.gradeLevel || isEditing) && (
            <View style={styles.infoItem}>
              <ScaledText style={styles.infoLabel}>Grade Level</ScaledText>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedChild?.gradeLevel || ''}
                  onChangeText={(text) => setEditedChild(prev => prev ? {...prev, gradeLevel: text} : null)}
                  placeholder="e.g., 3rd Grade"
                  placeholderTextColor={Colors.textLight}
                />
              ) : (
                <ScaledText style={styles.infoValue}>{activeChild.gradeLevel}</ScaledText>
              )}
            </View>
          )}

          {(activeChild.schoolName || isEditing) && (
            <View style={styles.infoItem}>
              <ScaledText style={styles.infoLabel}>School Name</ScaledText>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedChild?.schoolName || ''}
                  onChangeText={(text) => setEditedChild(prev => prev ? {...prev, schoolName: text} : null)}
                  placeholder="School name"
                  placeholderTextColor={Colors.textLight}
                />
              ) : (
                <ScaledText style={styles.infoValue}>{activeChild.schoolName}</ScaledText>
              )}
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
          <View style={styles.cardHeader}>
            <AlertCircle size={24} color={Colors.secondary} />
            <ScaledText style={styles.cardTitle}>Known Triggers</ScaledText>
          </View>
          <View style={styles.chipsContainer}>
            {activeChild.commonTriggers.map((trigger: string, idx: number) => (
              <View key={idx} style={styles.chip}>
                <ScaledText style={styles.chipText}>{trigger}</ScaledText>
              </View>
            ))}
            {activeChild.commonTriggers.length === 0 && (
              <ScaledText style={styles.emptyText}>No triggers recorded yet</ScaledText>
            )}
          </View>
          <ScaledText style={styles.helperText}>
            These triggers help personalize your journaling experience and AI insights
          </ScaledText>
        </GlassCard>

        {(activeChild.strengths && activeChild.strengths.length > 0) && (
          <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.cardHeader}>
              <Heart size={24} color={Colors.primary} />
              <ScaledText style={styles.cardTitle}>Strengths</ScaledText>
            </View>
            <View style={styles.chipsContainer}>
              {activeChild.strengths.map((strength: string, idx: number) => (
                <View key={idx} style={[styles.chip, styles.strengthChip]}>
                  <ScaledText style={[styles.chipText, styles.strengthChipText]}>{strength}</ScaledText>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {(activeChild.interests && activeChild.interests.length > 0) && (
          <GlassCard style={styles.infoCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
            <View style={styles.cardHeader}>
              <Sparkles size={24} color={Colors.secondary} />
              <ScaledText style={styles.cardTitle}>Interests</ScaledText>
            </View>
            <View style={styles.chipsContainer}>
              {activeChild.interests.map((interest: string, idx: number) => (
                <View key={idx} style={[styles.chip, styles.interestChip]}>
                  <ScaledText style={[styles.chipText, styles.interestChipText]}>{interest}</ScaledText>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        <View style={styles.explainerCard}>
          <ScaledText style={styles.explainerTitle}>How this profile customizes your experience</ScaledText>
          <View style={styles.explainerItem}>
            <ScaledText style={styles.explainerBullet}>•</ScaledText>
            <ScaledText style={styles.explainerText}>
              <ScaledText style={styles.explainerBold}>Diagnosis</ScaledText> helps tailor tag suggestions and AI insights
            </ScaledText>
          </View>
          <View style={styles.explainerItem}>
            <ScaledText style={styles.explainerBullet}>•</ScaledText>
            <ScaledText style={styles.explainerText}>
              <ScaledText style={styles.explainerBold}>Triggers</ScaledText> appear as quick-select options in meltdown logs
            </ScaledText>
          </View>
          <View style={styles.explainerItem}>
            <ScaledText style={styles.explainerBullet}>•</ScaledText>
            <ScaledText style={styles.explainerText}>
              <ScaledText style={styles.explainerBold}>School info</ScaledText> enables home vs. school behavior comparison
            </ScaledText>
          </View>
          <View style={styles.explainerItem}>
            <ScaledText style={styles.explainerBullet}>•</ScaledText>
            <ScaledText style={styles.explainerText}>
              <ScaledText style={styles.explainerBold}>Age</ScaledText> adjusts AI responses and suggestions appropriately
            </ScaledText>
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
    overflow: 'hidden' as const,
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
