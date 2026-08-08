'use client';

import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import { Button } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import { SquarePen } from 'lucide-react';
import { memo, useMemo } from 'react';

import DragUploadZone, { useUploadFiles } from '@/components/DragUploadZone';
import { type ActionKeys } from '@/features/ChatInput/ActionBar/config';
import { ActionBarContext } from '@/features/ChatInput/ActionBar/context';
import {
  COMPACT_ACTION_BAR_CONTEXT,
  COMPACT_ACTION_BAR_STYLE,
  COMPACT_SEND_BUTTON_PROPS,
} from '@/features/ChatInput/compactPreset';
import {
  ChatInput,
  ChatList,
  conversationSelectors,
  useConversationStore,
} from '@/features/Conversation';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';

/**
 * Trimmed action set: the panel is ~480px wide, so the full main-chat action
 * bar would wrap. These four cover everything business Q&A needs.
 */
const LEFT_ACTIONS: ActionKeys[] = ['model', 'fileUpload', 'search', 'tools'];

const styles = createStaticStyles(({ css }) => ({
  header: css`
    flex: none;
    padding-block: 8px;
    padding-inline: 12px;
    border-block-end: 1px solid #f0f0f0;
  `,
  welcome: css`
    overflow-y: auto;
    padding: 16px;
  `,
  welcomeButton: css`
    height: auto;
    padding-block: 8px;
    text-align: start;
    white-space: normal;
  `,
}));

interface WelcomeProps {
  emptyText: string;
  guideQuestions: string[];
}

const Welcome = memo<WelcomeProps>(({ emptyText, guideQuestions }) => {
  const sendMessage = useConversationStore((s) => s.sendMessage);
  const isInputLoading = useConversationStore(conversationSelectors.isInputLoading);

  return (
    <Flexbox className={styles.welcome} flex={1} gap={8} justify={'center'}>
      <Text style={{ marginBlockEnd: 4 }} type={'secondary'}>
        {emptyText}
      </Text>
      {guideQuestions.slice(0, 4).map((question) => (
        <Button
          block
          className={styles.welcomeButton}
          disabled={isInputLoading}
          key={question}
          onClick={() => sendMessage({ isWelcomeQuestion: true, message: question })}
        >
          {question}
        </Button>
      ))}
    </Flexbox>
  );
});

Welcome.displayName = 'BusinessChatWelcome';

interface ConversationProps {
  emptyText: string;
  guideQuestions: string[];
  onNewChat: () => void;
  title: string;
}

const Conversation = memo<ConversationProps>(({ emptyText, guideQuestions, onNewChat, title }) => {
  const agentId = useConversationStore(conversationSelectors.agentId);

  // Hydrate the shared business agent's config (model / provider / plugins);
  // ChatInput and the upload pipeline both read from it.
  const useFetchAgentConfig = useAgentStore((s) => s.useFetchAgentConfig);
  useFetchAgentConfig(!!agentId, agentId);

  const model = useAgentStore((s) => agentByIdSelectors.getAgentModelById(agentId)(s));
  const provider = useAgentStore((s) => agentByIdSelectors.getAgentModelProviderById(agentId)(s));
  const { handleUploadFiles } = useUploadFiles({ agentId, model, provider });

  const welcome = useMemo(
    () => <Welcome emptyText={emptyText} guideQuestions={guideQuestions} />,
    [emptyText, guideQuestions],
  );

  return (
    <DragUploadZone style={{ flex: 1, height: '100%' }} onUploadFiles={handleUploadFiles}>
      <Flexbox flex={1} height={'100%'} style={{ minHeight: 0, overflow: 'hidden' }}>
        <Flexbox horizontal align={'center'} className={styles.header} justify={'space-between'}>
          <Text ellipsis weight={600}>
            {title}
          </Text>
          <ActionIcon icon={SquarePen} size={'small'} title={'新对话'} onClick={onNewChat} />
        </Flexbox>

        <Flexbox flex={1} style={{ minHeight: 0, overflow: 'hidden' }}>
          <ChatList welcome={welcome} />
        </Flexbox>

        <ActionBarContext value={COMPACT_ACTION_BAR_CONTEXT}>
          <ChatInput
            actionBarStyle={COMPACT_ACTION_BAR_STYLE}
            allowExpand={false}
            leftActions={LEFT_ACTIONS}
            sendButtonProps={COMPACT_SEND_BUTTON_PROPS}
            showControlBar={false}
          />
        </ActionBarContext>
      </Flexbox>
    </DragUploadZone>
  );
});

Conversation.displayName = 'BusinessNativeConversation';

export default Conversation;
