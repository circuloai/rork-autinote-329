import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles, Trash2 } from 'lucide-react-native';
import { getColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassCard from '@/components/GlassCard';
import ScaledText from '@/components/ScaledText';
import { generateText } from '@rork-ai/toolkit-sdk';
import type { AnyLogEntry, DailyLogEntry, MeltdownLogEntry, LogEntry, MoodTag } from '@/types';

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

function toPlainTextFromMessageParts(parts: any[]): string {
  try {
    return (parts || [])
      .map((p) => {
        if (!p || typeof p !== 'object') return '';
        if (p.type === 'text') return String(p.text ?? '');
        return '';
      })
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { activeChild, activeChildLogs = [], chatHistory = [], saveChatHistory, clearChatHistory, preferences } = useApp();
  const Colors = useMemo(() => getColors(preferences), [preferences]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const clearedRef = useRef(false);

  const getMoodRating = (log: AnyLogEntry): string => {
    if (log.type === 'daily') return (log as DailyLogEntry).overallRating;
    if (log.type === 'meltdown') return (log as MeltdownLogEntry).moodAtEvent;
    return (log as LogEntry).moodRating;
  };

  const getMoodTags = (log: AnyLogEntry): MoodTag[] => {
    if (log.type === 'meltdown') return [];
    if (log.type === 'daily') return (log as DailyLogEntry).moodTags;
    return (log as LogEntry).moodTags;
  };

  const getPositiveNotes = (log: AnyLogEntry): string => {
    if (log.type === 'daily') return (log as DailyLogEntry).whatWentWell || '';
    return (log as LogEntry).positiveNotes || '';
  };

  const getChallengeNotes = (log: AnyLogEntry): string => {
    if (log.type === 'daily') return (log as DailyLogEntry).whatWasChallenging || '';
    if (log.type === 'meltdown') return (log as MeltdownLogEntry).additionalNotes || '';
    return (log as LogEntry).challengeNotes || '';
  };

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
      const childContext = activeChild
        ? {
            name: activeChild.name || 'Unknown',
            age: activeChild.age || 0,
            diagnosis: activeChild.diagnosis || 'Not specified',
            school: activeChild.schoolName || 'Not specified',
            grade: activeChild.gradeLevel || 'Not specified',
            triggers: activeChild.commonTriggers || [],
          }
        : null;

      const recentLogs = (activeChildLogs || []).slice(-14);
      const compactLogSummary = recentLogs.map((l) => ({
        date: l?.date ?? 'Unknown',
        mood: l ? getMoodRating(l) : 'Unknown',
        tags: l ? getMoodTags(l) : [],
        positiveNotes: l ? getPositiveNotes(l).slice(0, 240) : '',
        challengeNotes: l ? getChallengeNotes(l).slice(0, 240) : '',
      }));

      const history = localMessages.slice(-10).map((m) => {
        const role = m.role === 'user' ? 'user' : 'assistant';
        const content = toPlainTextFromMessageParts(m.parts);
        return { role, content } as { role: 'user' | 'assistant'; content: string };
      }).filter((m) => m.content.length > 0);

      const autumnStyle = (preferences as any)?.autumnStyle || 'warm';
      const autumnFocus = (preferences as any)?.autumnFocus as string[] | undefined;
      const autumnVerbosity = (preferences as any)?.autumnVerbosity || 'balanced';

      const focusList = Array.isArray(autumnFocus) && autumnFocus.length > 0
        ? autumnFocus.join(', ')
        : 'autism, behavior, emotional, sleep, sensory';

      const focusAreaDescriptions: Record<string, string> = {
        autism: 'autism spectrum support and understanding',
        behavior: 'behavior intervention strategies and ABA techniques',
        emotional: 'emotional regulation and co-regulation',
        sleep: 'sleep guidance and routines',
        sensory: 'sensory processing and sensory integration',
      };
      const focusDescList = Array.isArray(autumnFocus) && autumnFocus.length > 0
        ? autumnFocus.map((f) => focusAreaDescriptions[f] || f).join('; ')
        : Object.values(focusAreaDescriptions).join('; ');

      let verbosityRule = '';
      if (autumnVerbosity === 'short') {
        verbosityRule = 'RESPONSE LENGTH: 1-2 sentences only. No exceptions. Be extremely concise.';
      } else if (autumnVerbosity === 'detailed') {
        verbosityRule = 'RESPONSE LENGTH: Provide a thorough, in-depth response. Include background context, multiple concrete strategies, examples, and follow-up suggestions. Aim for 4-6 paragraphs.';
      } else {
        verbosityRule = 'RESPONSE LENGTH: 2-3 paragraphs. Include practical tips with enough context to be actionable.';
      }

      let styleInstructions = '';
      let acknowledgment = '';

      if (autumnStyle === 'professional') {
        styleInstructions = `TONE & FORMAT:
- Use a professional, clinical, evidence-based tone throughout
- Reference established therapeutic frameworks (ABA, DIR/Floortime, CBT, etc.) where relevant
- Use precise clinical terminology (e.g. "sensory dysregulation", "antecedent-behavior-consequence")
- Structure your response logically and clearly
- Avoid casual language, slang, contractions, or emotional metaphors
- Do NOT use bullet points, asterisks, or markdown — write in structured prose paragraphs
- Remain objective and data-oriented`;
        acknowledgment = "Understood. I will maintain a professional, evidence-based tone and reference clinical frameworks where appropriate.";
      } else if (autumnStyle === 'brief') {
        styleInstructions = `TONE & FORMAT:
- Be extremely direct and concise — get straight to the point
- No pleasantries, no preamble, no emotional warm-up
- Skip any phrases like "That sounds hard" or "I understand" — just give the answer
- Do NOT use bullet points, asterisks, or markdown
- One clear actionable insight or tip only`;
        acknowledgment = "Got it. I'll be direct and brief — no fluff, just the core answer.";
      } else {
        styleInstructions = `TONE & FORMAT:
- Be warm, empathetic, and conversational — like a knowledgeable supportive friend
- Use natural language and contractions
- Connect emotionally before offering practical advice
- Do NOT use bullet points, asterisks, or markdown — write in flowing paragraphs
- Make the caregiver feel heard and supported`;
        acknowledgment = "Got it — I'll be warm, conversational, and human. No formatting, just genuine support.";
      }

      const fullInstructions = `You are Autumn, an AI assistant for caregivers of autistic children.

${styleInstructions}

${verbosityRule}

FOCUS AREAS: You specialize in and should prioritize: ${focusDescList}. When questions fall outside these areas, briefly acknowledge and redirect to these specialties.

CONTEXT USAGE: You have context about the child and their recent logs. Reference it naturally when relevant, but never list or repeat data the caregiver already knows. Use it to personalize your response.`;

      const contextBlock = `Context (use when relevant):\n${JSON.stringify({ child: childContext, recentLogs: compactLogSummary }, null, 2)}`;

      console.log('[Chat] Sending request...');
      console.log('[Chat] Style:', autumnStyle, '| Verbosity:', autumnVerbosity, '| Focus:', focusList);
      console.log('[Chat] History messages:', history.length);
      console.log('[Chat] Recent logs:', recentLogs.length);
      console.log('[Chat] Context size:', contextBlock.length, 'chars');

      const assistantText = await generateText({
        messages: [
          { role: 'user', content: fullInstructions },
          { role: 'assistant', content: acknowledgment },
          ...history,
          { role: 'user', content: `${contextBlock}\n\nUser: ${text}` },
        ],
      });

      console.log('[Chat] Response received:', assistantText?.length || 0, 'chars');
      
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
  }, [activeChild, activeChildLogs, localMessages, preferences]);

  useEffect(() => {
    if (clearedRef.current) {
      clearedRef.current = false;
      return;
    }
    if (chatHistory && chatHistory.length > 0 && localMessages.length === 0) {
      setLocalMessages(chatHistory);
    }
  }, [chatHistory, localMessages.length]);

  useEffect(() => {
    if (localMessages.length > 0) {
      saveChatHistory(localMessages);
    }
  }, [localMessages, saveChatHistory]);

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

    console.log('=== Chat Send Debug ===');
    console.log('Input length:', text.length);
    console.log('Active Child:', activeChild?.id);
    console.log('Message count:', localMessages.length);
    console.log('======================');

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
      
      const errorMessage = err instanceof Error ? err.message : 'Unable to connect to AI service';
      Alert.alert(
        'Connection Error', 
        `${errorMessage}. Please check your internet connection and try again.`, 
        [{ text: 'OK' }]
      );
    }
  }, [activeChild?.id, appendLocalTextMessage, sendChat, input, localMessages.length, sending]);

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
                Hi! I&apos;m Autumn, your AI assistant{activeChild?.name ? ` with full knowledge of ${activeChild.name}'s profile and history` : ''}. {activeChild?.name && activeChild?.age ? `I understand ${activeChild.name} is ${activeChild.age} years old` : ''}{activeChild?.diagnosis ? ` with ${activeChild.diagnosis}` : ''}{activeChild ? ', and I' : 'I'}&apos;m here to provide personalized support.
              </ScaledText>
              <ScaledText style={styles.welcomeSubtext}>
                I have access to {activeChildLogs?.length || 0} log entries{activeChild?.name ? ` and know about ${activeChild.name}'s triggers, patterns, and progress` : ''}. Ask me anything!
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
});
