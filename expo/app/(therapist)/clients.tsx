import { useRouter } from 'expo-router';
import { Users, ChevronRight, Calendar as CalendarIcon, MessageCircle, RefreshCw } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { getAvatarById } from '@/constants/avatars';
import { supabase } from '@/lib/supabase';

export default function TherapistClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { therapistClients, logs, chatMessages, profile, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const acceptInvitesAndRefresh = useCallback(async (silent: boolean = false) => {
    setRefreshing(true);
    let linked = 0;
    try {
      const { data, error } = await supabase.rpc('accept_therapist_invites');
      if (error) {
        console.log('[Therapist] accept_therapist_invites error:', error);
        const email = (profile?.caregiverEmail || '').toLowerCase();
        const { data: fb, error: fbErr } = await supabase
          .from('shared_access')
          .update({ therapist_id: profile?.id, status: 'accepted', accepted_at: new Date().toISOString() })
          .neq('status', 'declined')
          .ilike('therapist_email', email)
          .select('id');
        if (fbErr) {
          if (!silent) {
            Alert.alert(
              'Could not accept invites',
              `${error.message}\n\nFallback also failed: ${fbErr.message}\n\nPlease run MIGRATION_THERAPIST_INVITES.sql in Supabase.`,
            );
          }
        } else {
          linked = fb?.length ?? 0;
          console.log('[Therapist] fallback linked:', linked);
        }
      } else {
        linked = (data as number) ?? 0;
        console.log('[Therapist] linked invites:', linked);
      }
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['therapistClients'] });
      await queryClient.invalidateQueries({ queryKey: ['sharedAccess'] });
      await queryClient.refetchQueries({ queryKey: ['therapistClients'] });
      if (!silent && linked > 0) {
        Alert.alert('Connected', `Linked ${linked} new ${linked === 1 ? 'client' : 'clients'}.`);
      }
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, profile?.id, profile?.caregiverEmail]);

  const clientCards = useMemo(() => {
    return therapistClients.map((tc) => {
      const childLogs = logs.filter((l) => l.childId === tc.child.id);
      const sortedLogs = [...childLogs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastLog = sortedLogs[0];

      const conversation = chatMessages.filter((m) => m.sharedAccessId === tc.sharedAccessId);
      const unread = conversation.filter(
        (m) => !m.isRead && m.senderId !== profile?.id
      ).length;

      return {
        ...tc,
        lastLogDate: lastLog?.date,
        unread,
        logCount: childLogs.length,
      };
    });
  }, [therapistClients, logs, chatMessages, profile?.id]);

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    const date = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.greeting}>Hello, {profile?.caregiverName || 'Therapist'}</Text>
        <Text style={styles.title}>My Clients</Text>
        <Text style={styles.subtitle}>
          {clientCards.length} {clientCards.length === 1 ? 'child' : 'children'} shared with you
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={acceptInvitesAndRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {clientCards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Users size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No clients yet</Text>
            <Text style={styles.emptyText}>
              When a caregiver invites you to collaborate on their child&apos;s care, they&apos;ll appear here.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={acceptInvitesAndRefresh}
              disabled={refreshing}
              activeOpacity={0.7}
              testID="check-invites"
            >
              <RefreshCw size={16} color={Colors.surface} />
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Checking…' : 'Check for invitations'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.emptyHint}>
              Pull to refresh anytime. Make sure the caregiver invited you using exactly:{' '}
              <Text style={{ fontWeight: '700' }}>{profile?.caregiverEmail || 'your account email'}</Text>.
            </Text>
          </View>
        ) : (
          clientCards.map((client) => {
            const avatar = getAvatarById(client.child.avatar);
            return (
              <TouchableOpacity
                key={client.sharedAccessId}
                style={styles.clientCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/therapist/client/${client.child.id}` as any)
                }
                testID={`client-${client.child.id}`}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: avatar?.bg || Colors.primary + '22' },
                  ]}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar.url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={[styles.avatarLetter, { color: Colors.primary }]}>
                      {client.child.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.clientInfo}>
                  <View style={styles.clientHeader}>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {client.child.name}
                    </Text>
                    <Text style={styles.clientAge}>· {client.child.age}y</Text>
                    {client.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{client.unread}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.parentLine} numberOfLines={1}>
                    Caregiver: {client.parentName}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <CalendarIcon size={12} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {client.lastLogDate
                          ? `Last log ${formatDate(client.lastLogDate)}`
                          : 'No logs yet'}
                      </Text>
                    </View>
                    {client.unread > 0 && (
                      <View style={styles.metaItem}>
                        <MessageCircle size={12} color={Colors.primary} />
                        <Text style={[styles.metaText, { color: Colors.primary }]}>
                          {client.unread} new
                        </Text>
                      </View>
                    )}
                  </View>

                  {client.child.diagnosis ? (
                    <View style={styles.diagnosisChip}>
                      <Text style={styles.diagnosisText} numberOfLines={1}>
                        {client.child.diagnosis}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <ChevronRight size={20} color={Colors.textLight} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    greeting: {
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '500' as const,
    },
    title: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: Colors.text,
      marginTop: 4,
    },
    subtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 6,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 20,
    },
    emptyIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: Colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 15,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    clientCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: Colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarLetter: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    clientInfo: {
      flex: 1,
      gap: 4,
    },
    clientHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    clientName: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: Colors.text,
      flexShrink: 1,
    },
    clientAge: {
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '500' as const,
    },
    unreadBadge: {
      marginLeft: 'auto',
      backgroundColor: Colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    unreadBadgeText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: Colors.surface,
    },
    parentLine: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 2,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: Colors.textSecondary,
      fontWeight: '500' as const,
    },
    diagnosisChip: {
      alignSelf: 'flex-start',
      backgroundColor: Colors.primary + '14',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginTop: 6,
    },
    diagnosisText: {
      fontSize: 12,
      color: Colors.primary,
      fontWeight: '600' as const,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: Colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 24,
    },
    refreshButtonText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: Colors.surface,
    },
    emptyHint: {
      fontSize: 12,
      color: Colors.textLight,
      textAlign: 'center',
      marginTop: 16,
      paddingHorizontal: 20,
      lineHeight: 18,
    },
  });
