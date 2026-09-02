export const CHAT_HISTORY_STORAGE_PREFIX = '@autinote_chat_history';

export function getChatHistoryStorageKey(userId?: string | null): string {
  return `${CHAT_HISTORY_STORAGE_PREFIX}:${userId || 'guest'}`;
}