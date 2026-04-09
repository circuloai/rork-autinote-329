import { useRouter } from 'expo-router';
import { Users, Plus, ChevronLeft, Mail, Shield, CheckCircle, Clock, XCircle, MessageCircle } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { SharedAccess } from '@/types';
import GlassCard from '@/components/GlassCard';

export default function SharedAccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sharedAccess, activeChild, preferences, deleteSharedAccess } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const activeChildAccess = useMemo(() => {
    if (!activeChild) return [];
    return sharedAccess.filter(sa => sa.childId === activeChild.id);
  }, [sharedAccess, activeChild]);

  const handleRemoveAccess = (access: SharedAccess) => {
    Alert.alert(
      'Remove Access',
      `Remove ${access.therapistName}'s access to ${activeChild?.name}'s data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteSharedAccess(access.id);
            Alert.alert('Success', 'Access removed successfully');
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'pending':
        return <Clock size={16} color={Colors.warning} />;
      case 'declined':
        return <XCircle size={16} color={Colors.error} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'declined':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  if (!activeChild) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shared Access</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No child profile selected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shared Access</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.childCard}>
          <Text style={styles.childCardTitle}>Managing access for</Text>
          <Text style={styles.childCardName}>{activeChild.name}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Connected Therapists</Text>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => router.push('/settings/invite-therapist' as any)}
              activeOpacity={0.7}
            >
              <Plus size={18} color={Colors.surface} />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {activeChildAccess.length === 0 ? (
            <GlassCard style={styles.emptyCard} fallbackStyle={{ backgroundColor: Colors.surface }}>
              <Users size={48} color={Colors.textLight} />
              <Text style={styles.emptyCardTitle}>No therapists connected</Text>
              <Text style={styles.emptyCardDescription}>
                Invite therapists to share access to {activeChild.name}&apos;s progress, logs, and insights
              </Text>
              <TouchableOpacity
                style={styles.emptyCardButton}
                onPress={() => router.push('/settings/invite-therapist' as any)}
                activeOpacity={0.7}
              >
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.emptyCardButtonText}>Invite Therapist</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <View style={styles.therapistsList}>
              {activeChildAccess.map((access) => (
                <View key={access.id} style={styles.therapistCard}>
                  <View style={styles.therapistIcon}>
                    <Users size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.therapistInfo}>
                    <View style={styles.therapistHeader}>
                      <Text style={styles.therapistName}>{access.therapistName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(access.status) + '20' }]}>
                        {getStatusIcon(access.status)}
                        <Text style={[styles.statusText, { color: getStatusColor(access.status) }]}>
                          {access.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.therapistDetails}>
                      <Mail size={14} color={Colors.textSecondary} />
                      <Text style={styles.therapistEmail}>{access.therapistEmail}</Text>
                    </View>
                    <Text style={styles.therapistRole}>{access.therapistRole}</Text>
                    
                    <View style={styles.therapistActions}>
                      {access.status === 'accepted' && (
                        <TouchableOpacity
                          style={styles.chatButton}
                          onPress={() => router.push(`/therapist-chat?sharedAccessId=${access.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <MessageCircle size={16} color={Colors.primary} />
                          <Text style={styles.chatButtonText}>Chat</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/settings/manage-permissions?id=${access.id}` as any)}
                        activeOpacity={0.7}
                      >
                        <Shield size={16} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>Manage Permissions</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveAccess(access)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeButtonText}>Remove Access</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Shared Access</Text>
          <Text style={styles.infoText}>
            When you invite therapists, they can:
          </Text>
          <View style={styles.infoBullet}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.infoText}>View your child&apos;s progress and logs (based on permissions)</Text>
          </View>
          <View style={styles.infoBullet}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.infoText}>Add professional session notes</Text>
          </View>
          <View style={styles.infoBullet}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.infoText}>Comment on your logs for better collaboration</Text>
          </View>
          <Text style={[styles.infoText, { marginTop: 12 }]}>
            You have full control over their permissions and can remove access at any time.
          </Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  childCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  childCardTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  childCardName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  emptyCardButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  therapistsList: {
    gap: 12,
  },
  therapistCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  therapistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistInfo: {
    flex: 1,
  },
  therapistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  therapistName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  therapistDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  therapistEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  therapistRole: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  therapistActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  infoCard: {
    backgroundColor: Colors.secondary + '10',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  infoBullet: {
    flexDirection: 'row',
    marginTop: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: Colors.secondary,
    marginRight: 8,
    fontWeight: '700' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
