import { useCallback, useEffect, useState } from 'react';

import { topicService } from '@/services/topic';

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
 *
 * Resolution order:
 *  1. Browser-local pointer (localStorage) — fast, zero network.
 *  2. Server-authoritative fallback — when the local pointer is missing
 *     (private mode, cleared cache, or a different device), the existing topic
 *     is resolved from the server by its `businessContext` binding, so we
 *     reconnect to the record's conversation instead of creating a fresh orphan.
 */
export const useBusinessTopic = (kind: BusinessAgentKind, contextId: string, agentId?: string) => {
  const storageKey = buildTopicStorageKey(kind, contextId);

  const [topicId, setTopicId] = useState<string | undefined>(() => readTopic(storageKey));

  // Switching to another archive/enterprise must swap the topic pointer
  // synchronously with the key, otherwise the panel would briefly render the
  // previous record's conversation.
  useEffect(() => {
    setTopicId(readTopic(storageKey));
  }, [storageKey]);

  // Server-authoritative fallback: when the browser-local pointer is missing,
  // reconnect to the record's existing topic instead of starting a new orphan.
  useEffect(() => {
    if (topicId || !agentId) return;

    let cancelled = false;

    (async () => {
      try {
        const { items } = await topicService.getTopics({ agentId, pageSize: 200 });
        if (cancelled) return;

        const match = items.find((topic) => {
          const binding = topic.metadata?.businessContext;
          if (!binding || binding.kind !== kind) return false;
          return kind === 'archive'
            ? binding.archiveId === contextId
            : binding.enterpriseId === contextId;
        });

        if (match?.id) {
          writeTopic(storageKey, match.id);
          setTopicId(match.id);
        }
      } catch {
        /* non-critical: the first message will create a fresh topic */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, topicId, agentId, kind, contextId]);

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
