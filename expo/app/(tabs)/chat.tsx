import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles, Trash2 } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/GlassCard';
import ScaledText from '@/components/ScaledText';
import { trpcClient } from '@/lib/trpc';
import type { Preferences } from '@/types';
import AiConsentModal from '@/components/AiConsentModal';

type ChatRole = 'user' | 'assistant';

type ChatTextPart = {
  type: 'text';
  text: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  parts: ChatTextPart[];
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, chatHistory = [], saveChatHistory, clearChatHistory, preferences, savePreferencesAsync } = useApp();
  const { user, isAuthenticated: hasSession } = useAuth();
  const Colors = useColors(preferences);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [consentPending, setConsentPending] = useState<string | null>(null);
  const [consentGrantedThisSession, setConsentGrantedThisSession] = useState(false);
  const [historyOwner, setHistoryOwner] = useState(user?.id || 'guest');
  const scrollViewRef = useRef<ScrollView>(null);
  const clearedRef = useRef(false);
  const accountKey = user?.id || 'guest';

  const appendLocalTextMessage = useCallback((role: ChatRole, text: string) => {
    const msg: ChatMessage = {
      id: makeId(role),
      role,
      parts: [{ type: 'text', text }],
    };
    setLocalMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const sendChat = useCallback(async (text: string) => {
    setSending(true);

    try {
      if (!activeChild?.id) throw new Error('No active child profile is selected.');

      const assistantResult = await trpcClient.ai.autumn.mutate({
        childId: activeChild.id,
        message: text,
        useChildContext: preferences?.aiPreferences?.personalizationEnabled !== false,
        style: preferences?.autumnStyle || 'warm',
        focus: preferences?.autumnFocus || [],
        verbosity: preferences?.autumnVerbosity || 'balanced',
      });
      const assistantText = assistantResult.response;

      if (!assistantText || typeof assistantText !== 'string') {
        throw new Error('Invalid response from AI service');
      }

      return assistantText;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[Chat] Error details:', e);
      console.error('[Chat] Error type:', typeof e);
      console.error('[Chat] Error message:', msg);
      throw e;
    } finally {
      setSending(false);
      console.log('[Chat] Send completed');
    }
  }, [activeChild, preferences]);

  useEffect(() => {
    if (historyOwner === accountKey) return;
    setHistoryOwner(accountKey);
    setLocalMessages([]);
    clearedRef.current = true;
  }, [accountKey, historyOwner]);

  useEffect(() => {
    if (clearedRef.current) {
      clearedRef.current = false;
      return;
    }
    if (chatHistory && chatHistory.length > 0 && localMessages.length === 0) {
      setLocalMessages(chatHistory);
    }
  }, [chatHistory, localMessages.length, historyOwner, accountKey]);

  useEffect(() => {
    if (historyOwner === accountKey && localMessages.length > 0) {
      saveChatHistory(localMessages);
    }
  }, [localMessages, saveChatHistory, historyOwner, accountKey]);

  useEffect(() => {
    if (localMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [localMessages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (
      !consentGrantedThisSession &&
      preferences?.aiPreferences?.consentStatus !== 'granted'
    ) {
      setConsentPending(text);
      return;
    }

    setInput('');
    appendLocalTextMessage('user', text);

    try {
      const assistant = await sendChat(text);
      appendLocalTextMessage('assistant', assistant);
      console.log('[Chat] Send successful');
    } catch (err) {
      console.error('=== Send Error ===');
      console.error('Error:', err);
      console.error('==================');
      
      const errorMessage = err instanceof Error ? err.message : 'Unable to connect to Autumn';
      Alert.alert(
        'Autumn is unavailable',
        `${errorMessage} Please check your connection and try again.`,
        [{ text: 'OK' }]
      );
    }
  }, [appendLocalTextMessage, sendChat, input, sending, preferences?.aiPreferences?.consentStatus, consentGrantedThisSession]);

  const acceptConsent = useCallback(async () => {
    if (preferences) {
      const nextPreferences: Preferences = {
        ...preferences,
        aiPreferences: {
          consentStatus: 'granted',
          consentVersion: '2026-08-20',
          consentedAt: new Date().toISOString(),
          personalizationEnabled: true,
        },
      };
      await savePreferencesAsync(nextPreferences);
      setConsentGrantedThisSession(true);
      setConsentPending(null);
    }
  }, [preferences, savePreferencesAsync]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear Chat History',
      'This will delete all previous conversations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearedRef.current = true;
            clearChatHistory();
            setLocalMessages([]);
          },
        },
      ]
    );
  }, [clearChatHistory]);

  const suggestedQuestions = activeChild?.diagnosis
    ? [
      `Patterns in ${activeChild.name}'s logs?`,
      `Tips for ${activeChild.name}'s triggers?`,
      `How is ${activeChild.name} progressing?`,
      `Strategies for ${activeChild.diagnosis}?`,
    ]
    : [
      "What patterns do you see?",
      "How can I support better?",
      "What insights can you provide?",
      "Tips for logging effectively?",
    ];

  if (!hasSession) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.guestGate, { paddingTop: insets.top + 24 }]}>
          <Sparkles size={36} color={Colors.secondary} />
          <ScaledText style={styles.guestGateTitle}>Autumn is ready when you are</ScaledText>
          <ScaledText style={styles.guestGateText}>
            Sign in with a child profile to ask questions and keep your conversation private to your account.
          </ScaledText>
          <TouchableOpacity
            style={[styles.guestGateButton, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/login' as any)}
            activeOpacity={0.8}
          >
            <ScaledText style={[styles.guestGateButtonText, { color: Colors.surface }]}>Sign in to chat</ScaledText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Sparkles size={32} color={Colors.secondary} />
            <View>
              <ScaledText style={styles.title}>Autumn</ScaledText>
              <ScaledText style={styles.subtitle}>AI Assistant</ScaledText>
            </View>
          </View>
          {localMessages.length > 0 && (
            <TouchableOpacity
              onPress={handleClearHistory}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {localMessages.length === 0 && (
            <View style={styles.welcome}>
              <ScaledText style={styles.welcomeText}>
                Hi! I&apos;m Autumn, a support companion for caregivers. I&apos;m here to help you think through routines, regulation, communication, and everyday moments.
              </ScaledText>
              <ScaledText style={styles.welcomeSubtext}>
                With your permission, I can use only relevant, limited context to make a response more helpful. You can change that permission in Data & Privacy.
              </ScaledText>
              <ScaledText style={styles.suggestionsTitle}>Try asking:</ScaledText>
              {suggestedQuestions.map((q, i) => (
                <GlassCard
                  key={i}
                  style={styles.suggestionButton}
                  fallbackStyle={{ backgroundColor: Colors.surface }}
                >
                  <TouchableOpacity
                    onPress={() => setInput(q)}
                    activeOpacity={0.7}
                  >
                    <ScaledText style={styles.suggestionText}>{q}</ScaledText>
                  </TouchableOpacity>
                </GlassCard>
              ))}
            </View>
          )}

          {localMessages.map((message) => (
            <View key={message.id} style={styles.messageGroup}>
              {message.parts.map((part, partIndex) => {
                if (part.type === 'text') {
                  return (
                    <View
                      key={`${message.id}-${partIndex}`}
                      style={[
                        styles.messageBubble,
                        message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <ScaledText
                        style={[
                          styles.messageText,
                          message.role === 'user' ? styles.userText : styles.assistantText,
                        ]}
                      >
                        {part.text}
                      </ScaledText>
                    </View>
                  );
                }
                return null;
              })}
            </View>
          ))}



          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16, backgroundColor: Colors.background, borderTopColor: Colors.border }]}>
          <TextInput
            testID="chatInput"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            testID="chatSendButton"
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
        <AiConsentModal
          visible={consentPending !== null}
          onCancel={() => setConsentPending(null)}
          onAgree={acceptConsent}
          providerName="OpenAI"
          preferences={preferences}
        />
    </View>
  );
}

const createStyles = (Colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcome: {
    gap: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  suggestionButton: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
  },
  messageGroup: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: Colors.background,
  },
  assistantText: {
    color: Colors.text,
  },
  toolBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  toolText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  guestGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  guestGateTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  guestGateText: {
    maxWidth: 360,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  guestGateButton: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
  },
  guestGateButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  errorBubble: {
    backgroundColor: Colors.error + '20',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  consentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    gap: 14,
  },
  consentTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  consentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  consentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  consentSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  consentSecondaryText: {
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  consentPrimaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  consentPrimaryText: {
    color: Colors.background,
    fontWeight: '700' as const,
  },
});
