import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { MessageCircle, Send, ChevronLeft, User } from 'lucide-react-native';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function TherapistChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sharedAccessId } = useLocalSearchParams<{ sharedAccessId: string }>();
  const { sharedAccess, chatMessages, profile, preferences, saveChatMessage, activeChild } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  
  const [messageText, setMessageText] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);

  const currentAccess = useMemo(() => {
    return sharedAccess.find(sa => sa.id === sharedAccessId);
  }, [sharedAccess, sharedAccessId]);

  const conversationMessages = useMemo(() => {
    if (!sharedAccessId) return [];
    return chatMessages.filter(msg => msg.sharedAccessId === sharedAccessId);
  }, [chatMessages, sharedAccessId]);

  const isParent = useMemo(() => {
    return currentAccess?.parentId === profile?.id;
  }, [currentAccess, profile]);

  const otherPersonName = useMemo(() => {
    if (!currentAccess) return 'Unknown';
    if (isParent) {
      return currentAccess.therapistName;
    }
    return activeChild?.name ? `${activeChild.name}'s Caregiver` : 'Caregiver';
  }, [currentAccess, isParent, activeChild]);

  useEffect(() => {
    if (conversationMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationMessages.length]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !sharedAccessId || !profile) return;

    const senderName = profile.caregiverName || profile.role || 'User';

    saveChatMessage({
      sharedAccessId,
      senderId: profile.id,
      senderName,
      messageText: messageText.trim(),
      isRead: false,
    });

    setMessageText('');
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  if (!currentAccess) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>Conversation not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarContainer}>
            <User size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{otherPersonName}</Text>
            <Text style={styles.headerSubtitle}>{currentAccess.therapistRole}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {conversationMessages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <MessageCircle size={64} color={Colors.textLight} />
            <Text style={styles.emptyMessagesTitle}>Start the conversation</Text>
            <Text style={styles.emptyMessagesText}>
              Send a message to {otherPersonName} to start collaborating on {activeChild?.name}&apos;s care
            </Text>
          </View>
        ) : (
          <>
            {conversationMessages.map((message, index) => {
              const isMyMessage = message.senderId === profile?.id;
              const showDate = index === 0 || 
                new Date(conversationMessages[index - 1].createdAt).toDateString() !== 
                new Date(message.createdAt).toDateString();

              return (
                <View key={message.id}>
                  {showDate && (
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateSeparatorText}>
                        {new Date(message.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: new Date(message.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
                    <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
                      {!isMyMessage && (
                        <Text style={styles.messageSenderName}>{message.senderName}</Text>
                      )}
                      <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                        {message.messageText}
                      </Text>
                      <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
                        {new Date(message.createdAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 16 }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${otherPersonName}...`}
            placeholderTextColor={Colors.textLight}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            activeOpacity={0.7}
          >
            <Send size={20} color={messageText.trim() ? Colors.surface : Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyMessagesTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyMessagesText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  theirMessageBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.surface,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  myMessageTime: {
    color: Colors.surface + 'CC',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
