import { useCallback, useEffect, useState } from 'react';

import { buildTopicStorageKey, type BusinessAgentKind } from './utils';

const readTopic = (key: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
};

const writeTopic = (key: string, topicId: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, topicId);
  } catch {
    /* storage may be unavailable (private mode / quota) — degrade to in-memory */
  }
};

const clearTopic = (key: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/**
 * One persistent topic per business record (archive / enterprise).
 *
 * The panel runs under `isolatedTopic: true`, so the global
 * `useChatStore.activeTopicId` is never touched — this hook is the panel's own
 * topic pointer. `onTopicCreated` feeds the server-assigned topic id back here
 * the first time the user sends a message, and it is persisted so re-opening
 * the same archive restores the conversation.
 */
export const useBusinessTopic = (kind: BusinessAgentKind, contextId: string) => {
  const storageKey = buildTopicStorageKey(kind, contextId);

  const [topicId, setTopicId] = useState<string | undefined>(() => readTopic(storageKey));

  // Switching to another archive/enterprise must swap the topic pointer
  // synchronously with the key, otherwise the panel would briefly render the
  // previous record's conversation.
  useEffect(() => {
    setTopicId(readTopic(storageKey));
  }, [storageKey]);

  const persistTopicId = useCallback(
    (createdTopicId: string) => {
      if (!createdTopicId) return;
      writeTopic(storageKey, createdTopicId);
      setTopicId(createdTopicId);
    },
    [storageKey],
  );

  const resetTopic = useCallback(() => {
    clearTopic(storageKey);
    setTopicId(undefined);
  }, [storageKey]);

  return { persistTopicId, resetTopic, topicId };
};
