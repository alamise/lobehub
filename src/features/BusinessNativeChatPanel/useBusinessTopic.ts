import { useCallback, useEffect, useMemo, useState } from 'react';

import { topicService } from '@/services/topic';

import {
  buildBusinessContext,
  buildLegacyTopicStorageKey,
  buildTopicStorageKey,
  type BusinessAgentKind,
} from './utils';

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
  const storageKey = buildTopicStorageKey(kind, contextId, agentId);
  const businessContext = useMemo(() => buildBusinessContext(kind, contextId), [kind, contextId]);
  const [state, setState] = useState<{
    forceNew?: boolean;
    key: string;
    status: 'error' | 'ready' | 'resolving';
    topicId?: string;
  }>(() => ({ key: storageKey, status: 'resolving', topicId: readTopic(storageKey) }));
  const currentState = state.key === storageKey ? state : undefined;
  const topicId = currentState?.topicId;
  const hasResolutionError = currentState?.status === 'error';
  const isResolving = !currentState || currentState.status !== 'ready';

  // Switching to another archive/enterprise must swap the topic pointer
  // synchronously with the key, otherwise the panel would briefly render the
  // previous record's conversation.
  useEffect(() => {
    let localTopicId = readTopic(storageKey);
    if (!localTopicId) {
      localTopicId = readTopic(buildLegacyTopicStorageKey(kind, contextId));
      if (localTopicId) writeTopic(storageKey, localTopicId);
    }
    setState({ key: storageKey, status: 'resolving', topicId: localTopicId });
  }, [storageKey, kind, contextId]);

  // Server-authoritative fallback: when the browser-local pointer is missing,
  // reconnect to the record's existing topic instead of starting a new orphan.
  useEffect(() => {
    if (!agentId || !businessContext || state.key !== storageKey || state.forceNew) return;

    let cancelled = false;

    (async () => {
      try {
        const match = await topicService.getBusinessTopic({ agentId, businessContext });
        if (cancelled) return;

        if (match?.id) {
          writeTopic(storageKey, match.id);
          setState({ key: storageKey, status: 'ready', topicId: match.id });
        } else {
          setState({ key: storageKey, status: 'ready' });
        }
      } catch {
        if (!cancelled) setState({ key: storageKey, status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, state.key, topicId, agentId, businessContext]);

  const persistTopicId = useCallback(
    (createdTopicId: string) => {
      if (!createdTopicId) return;
      writeTopic(storageKey, createdTopicId);
      setState({ forceNew: false, key: storageKey, status: 'ready', topicId: createdTopicId });
    },
    [storageKey],
  );

  const resetTopic = useCallback(() => {
    clearTopic(storageKey);
    setState({ forceNew: true, key: storageKey, status: 'ready' });
  }, [storageKey]);

  return { hasResolutionError, isResolving, persistTopicId, resetTopic, topicId };
};
