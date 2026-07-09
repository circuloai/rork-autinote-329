import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { getAvatarById } from '@/constants/avatars';

export default function TherapistMessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { therapistClients, chatMessages, profile, preferences } = useApp();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const conversations = useMemo(() => {
    return therapistClients.map((tc) => {
      const msgs = chatMessages
        .filter((m) => m.sharedAccessId === tc.sharedAccessId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(
        (m) => !m.isRead && m.senderId !== profile?.id
      ).length;
      return {
        sharedAccessId: tc.sharedAccessId,
        childName: tc.child.name,
        avatar: getAvatarById(tc.child.avatar),
        parentName: tc.parentName,
        lastMessage: last?.messageText,
        lastSenderId: last?.senderId,
        lastTime: last?.createdAt,
        unread,
      };
    }).sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
    });
  }, [therapistClients, chatMessages, profile?.id]);

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <ScaledText style={styles.title}>Messages</ScaledText>
        <ScaledText style={styles.subtitle}>Caregiver conversations</ScaledText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={40} color={Colors.primary} />
            </View>
            <ScaledText style={styles.emptyTitle}>No conversations</ScaledText>
            <ScaledText style={styles.emptyText}>
              Once a caregiver shares a child with you, you can message them here.
            </ScaledText>
          </View>
        ) : (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv.sharedAccessId}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() =>
                router.push(`/therapist-chat?sharedAccessId=${conv.sharedAccessId}` as any)
              }
              testID={`conv-${conv.sharedAccessId}`}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: conv.avatar?.bg || Colors.primary + '22' },
                ]}
              >
                {conv.avatar ? (
                  <Image source={{ uri: conv.avatar.url }} style={styles.avatarImage} />
                ) : (
                  <ScaledText style={[styles.avatarLetter, { color: Colors.primary }]}>
                    {conv.childName.charAt(0).toUpperCase()}
                  </ScaledText>
                )}
              </View>

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <ScaledText style={styles.rowName} numberOfLines={1}>
                    {conv.parentName}
                  </ScaledText>
                  {conv.lastTime ? (
                    <ScaledText style={styles.rowTime}>{formatTime(conv.lastTime)}</ScaledText>
                  ) : null}
                </View>
                <ScaledText style={styles.rowChild} numberOfLines={1}>
                  Re: {conv.childName}
                </ScaledText>
                <View style={styles.rowBottom}>
                  <ScaledText
                    style={[
                      styles.rowPreview,
                      conv.unread > 0 && styles.rowPreviewUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage
                      ? `${conv.lastSenderId === profile?.id ? 'You: ' : ''}${conv.lastMessage}`
                      : 'Start the conversation'}
                  </ScaledText>
                  {conv.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <ScaledText style={styles.unreadBadgeText}>{conv.unread}</ScaledText>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
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
    title: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: Colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 4,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingTop: 4,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarLetter: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: Colors.text,
      flex: 1,
    },
    rowTime: {
      fontSize: 12,
      color: Colors.textSecondary,
      marginLeft: 8,
    },
    rowChild: {
      fontSize: 12,
      color: Colors.primary,
      fontWeight: '600' as const,
    },
    rowBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    rowPreview: {
      flex: 1,
      fontSize: 14,
      color: Colors.textSecondary,
    },
    rowPreviewUnread: {
      color: Colors.text,
      fontWeight: '600' as const,
    },
    unreadBadge: {
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
  });
