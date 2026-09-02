import { describe, expect, test } from 'bun:test';
import { getChatHistoryStorageKey } from './chatHistory';

describe('account-scoped chat history keys', () => {
  test('creates a distinct storage key for each account', () => {
    expect(getChatHistoryStorageKey('user-a')).not.toBe(getChatHistoryStorageKey('user-b'));
    expect(getChatHistoryStorageKey('user-a')).toBe('@autinote_chat_history:user-a');
  });

  test('does not use an account key for signed-out history', () => {
    expect(getChatHistoryStorageKey()).toBe('@autinote_chat_history:guest');
    expect(getChatHistoryStorageKey(null)).toBe('@autinote_chat_history:guest');
  });
});