import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import ScaledText from '@/components/ScaledText';
import { useColors } from '@/hooks/useColors';
import type { Preferences } from '@/types';

export const AI_CONSENT_STORAGE_KEY = '@autinote_ai_consent_v1';

export async function getStoredAiConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AI_CONSENT_STORAGE_KEY)) === 'accepted';
  } catch (error) {
    console.error('[AI consent] Could not read local consent:', error);
    return false;
  }
}

export async function clearStoredAiConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AI_CONSENT_STORAGE_KEY);
  } catch (error) {
    console.error('[AI consent] Could not clear local consent:', error);
  }
}

type AiConsentModalProps = {
  visible: boolean;
  onAgree: () => void | Promise<void>;
  onCancel: () => void;
  providerName?: string;
  preferences?: Preferences | null;
};

export default function AiConsentModal({
  visible,
  onAgree,
  onCancel,
  providerName = 'OpenAI',
  preferences,
}: AiConsentModalProps) {
  const Colors = useColors(preferences);
  const [saving, setSaving] = useState(false);

  const handleAgree = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(AI_CONSENT_STORAGE_KEY, 'accepted');
      await onAgree();
    } catch (error) {
      console.error('[AI consent] Could not save consent:', error);
    } finally {
      setSaving(false);
    }
  }, [onAgree, saving]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: Colors.surface }]}>
          <ScaledText style={[styles.title, { color: Colors.text }]}>
            Use Autumn securely
          </ScaledText>
          <ScaledText style={[styles.body, { color: Colors.textSecondary }]}>
            To generate your summaries, AutiNote sends your notes to {providerName}.
          </ScaledText>
          <ScaledText style={[styles.body, { color: Colors.textSecondary }]}>
            Only the current message and limited relevant context are shared. Names,
            schools, photos, therapist notes, full journal entries, and chat history
            are not sent. Your chat history stays on this device.
          </ScaledText>
          <ScaledText style={[styles.body, { color: Colors.textSecondary }]}>
            Autumn provides general support, not medical or clinical advice. You can
            turn it off any time from Data & Privacy.
          </ScaledText>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel AI consent"
              style={[styles.secondaryButton, { borderColor: Colors.border }]}
              onPress={onCancel}
              disabled={saving}
            >
              <ScaledText style={[styles.secondaryText, { color: Colors.textSecondary }]}>
                Cancel
              </ScaledText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Agree to AI consent"
              style={[styles.primaryButton, { backgroundColor: Colors.primary }]}
              onPress={handleAgree}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <ScaledText style={[styles.primaryText, { color: Colors.background }]}>
                  I Agree
                </ScaledText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 18,
    padding: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
});