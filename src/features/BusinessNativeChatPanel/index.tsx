'use client';

import { Flexbox } from '@lobehub/ui';
import { Empty } from 'antd';
import { createStaticStyles } from 'antd-style';
import type { MouseEvent } from 'react';
import { memo, useCallback, useMemo } from 'react';

import { useChatStore } from '@/store/chat';

import { BusinessConversationProvider } from './BusinessConversationProvider';
import Conversation from './Conversation';
import { useBusinessTopic } from './useBusinessTopic';
import {
  buildBusinessContext,
  type BusinessAgentKind,
  isCurrentArchiveReferenceHref,
} from './utils';

export { isCurrentArchiveReferenceHref } from './utils';

const styles = createStaticStyles(({ css }) => ({
  root: css`
    overflow: hidden;
    display: flex;
    flex: 1;
    flex-direction: column;

    min-height: 0;
  `,
}));

interface BusinessNativeChatPanelProps {
  /** Shared business agent id, resolved from server config. */
  agentId?: string;
  /** Archive / enterprise display title, surfaced in the temporary debug bar. */
  archiveTitle?: string;
  /** Archive id or enterprise id the conversation is scoped to. */
  contextId: string;
  /** When set, the panel renders a disabled placeholder instead of the chat. */
  disabledReason?: string;
  emptyText?: string;
  guideQuestions?: string[];
  kind: BusinessAgentKind;
  /**
   * Called when the user clicks a citation that points at a page of the archive
   * already open in the left preview pane, so the host can jump the viewer
   * in-place instead of navigating away.
   */
  onInternalReferenceClick?: (href: string) => void;
  title: string;
}

const Placeholder = memo<{ description: string }>(({ description }) => (
  <Flexbox align={'center'} flex={1} justify={'center'} padding={24}>
    <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  </Flexbox>
));

Placeholder.displayName = 'BusinessNativeChatPlaceholder';

/**
 * Business detail-page Q&A panel backed by the native conversation stack.
 *
 * Replaces the previous hand-rolled panel: message rendering, auto-scroll,
 * tool-call traces, Markdown, message cards and the debug inspector all come
 * from `@/features/Conversation` for free. The only business-specific wiring is
 * the `businessContext` injection (scopes server-side tool calls to this exact
 * record) and the per-record topic pointer.
 */
const BusinessNativeChatPanel = memo<BusinessNativeChatPanelProps>(
  ({
    agentId,
    contextId,
    disabledReason,
    emptyText,
    guideQuestions,
    kind,
    onInternalReferenceClick,
    title,
  }) => {
    const { hasResolutionError, isResolving, persistTopicId, resetTopic, topicId } =
      useBusinessTopic(kind, contextId, agentId);

    const businessContext = useMemo(() => buildBusinessContext(kind, contextId), [kind, contextId]);

    const stableGuideQuestions = useMemo(() => guideQuestions ?? [], [guideQuestions]);

    const handleNewChat = useCallback(() => {
      // Isolated topics never clear the `_new` message bucket on topic creation
      // (that path is reserved for the global active topic), so drop it here —
      // otherwise the fresh conversation would replay the previous exchange.
      if (agentId) {
        useChatStore.getState().replaceMessages([], {
          action: 'businessNativeChatPanel/newChat',
          context: { agentId, businessContext, isolatedTopic: true, scope: 'main' },
        });
      }
      resetTopic();
    }, [agentId, businessContext, resetTopic]);

    // Citations rendered by the native Markdown pipeline are plain anchors, so
    // intercept them on the capture phase instead of overriding the renderer.
    const handleClickCapture = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        if (!onInternalReferenceClick) return;

        const anchor = (event.target as HTMLElement | null)?.closest?.('a');
        const href = anchor?.getAttribute('href') || undefined;
        if (!isCurrentArchiveReferenceHref(href, contextId)) return;

        event.preventDefault();
        event.stopPropagation();
        onInternalReferenceClick(href || '');
      },
      [contextId, onInternalReferenceClick],
    );

    if (disabledReason) return <Placeholder description={disabledReason} />;
    if (!agentId) return <Placeholder description={'未配置共享 Agent ID'} />;
    if (!businessContext) return <Placeholder description={'缺少业务上下文标识'} />;

    return (
      <div className={styles.root} onClickCapture={handleClickCapture}>
        <BusinessConversationProvider
          agentId={agentId}
          businessContext={businessContext}
          topicId={topicId}
          onTopicCreated={persistTopicId}
        >
          <Conversation
            disabled={isResolving}
            guideQuestions={stableGuideQuestions}
            title={title}
            emptyText={
              hasResolutionError
                ? '会话恢复失败，请点击“新对话”重试'
                : (emptyText ?? '可以就当前内容向我提问')
            }
            onNewChat={handleNewChat}
          />
        </BusinessConversationProvider>
      </div>
    );
  },
);

BusinessNativeChatPanel.displayName = 'BusinessNativeChatPanel';

export default BusinessNativeChatPanel;
