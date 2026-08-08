'use client';

import type { BusinessAgentContext, ConversationContext } from '@lobechat/types';
import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';

import { type ConversationHooks, ConversationProvider } from '@/features/Conversation';
import { useGatewayReconnect } from '@/hooks/useGatewayReconnect';
import { useOperationState } from '@/hooks/useOperationState';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';

interface BusinessConversationProviderProps {
  agentId: string;
  businessContext: BusinessAgentContext;
  children: ReactNode;
  /** Called with the server-assigned topic id the first time a topic is created. */
  onTopicCreated: (topicId: string) => void;
  topicId?: string;
}

/**
 * Wires a business detail page (archive / enterprise) into the native
 * conversation stack.
 *
 * Mirrors the isolated-panel pattern used by TaskManager / PageEditor Copilot:
 * the conversation coordinates are supplied as props instead of being read off
 * the router, and `isolatedTopic` keeps the global active-topic pointer
 * untouched so opening a detail page never hijacks the main chat.
 */
export const BusinessConversationProvider = memo<BusinessConversationProviderProps>(
  ({ agentId, businessContext, children, onTopicCreated, topicId }) => {
    const context = useMemo<ConversationContext>(
      () => ({
        agentId,
        businessContext,
        // The panel owns its topic pointer (persisted per business record);
        // never write it back into the global chat store.
        isolatedTopic: true,
        scope: 'main',
        topicId,
      }),
      [agentId, businessContext, topicId],
    );

    const chatKey = useMemo(() => messageMapKey(context), [context]);
    const messages = useChatStore((s) => s.dbMessagesMap[chatKey]);
    const replaceMessages = useChatStore((s) => s.replaceMessages);
    const operationState = useOperationState(context);

    // Resume streaming if the user reloads while a run is still in flight.
    const runningOperation = useChatStore((s) =>
      topicId ? topicSelectors.getTopicById(topicId)(s)?.metadata?.runningOperation : undefined,
    );
    useGatewayReconnect(topicId, runningOperation);

    const hooks = useMemo<ConversationHooks>(() => ({ onTopicCreated }), [onTopicCreated]);

    return (
      <ConversationProvider
        context={context}
        hasInitMessages={!!messages}
        hooks={hooks}
        messages={messages}
        operationState={operationState}
        onMessagesChange={(msgs, ctx) => {
          replaceMessages(msgs, { context: ctx });
        }}
      >
        {children}
      </ConversationProvider>
    );
  },
);

BusinessConversationProvider.displayName = 'BusinessConversationProvider';
