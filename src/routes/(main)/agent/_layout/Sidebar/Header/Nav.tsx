'use client';

import { Flexbox } from '@lobehub/ui';
import { MessageSquarePlusIcon, SearchIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import urlJoin from 'url-join';

import NavItem from '@/features/NavPanel/components/NavItem';
import { usePermission } from '@/hooks/usePermission';
import { useQueryRoute } from '@/hooks/useQueryRoute';
import { useActionSWR } from '@/libs/swr';
import { topicActionKeys } from '@/libs/swr/keys';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';
import { useGlobalStore } from '@/store/global';

const Nav = memo(() => {
  const { t } = useTranslation('chat');
  const { t: tTopic } = useTranslation('topic');
  const params = useParams();
  const agentId = params.aid;
  const router = useQueryRoute();
  const { allowed: canCreateTopic } = usePermission('create_content');
  const toggleCommandMenu = useGlobalStore((s) => s.toggleCommandMenu);
  const [openNewTopicOrSaveTopic] = useChatStore((s) => [s.openNewTopicOrSaveTopic]);
  const isNewTopicSendInFlight = useChatStore(topicSelectors.isNewTopicSendInFlight);

  const { mutate } = useActionSWR(topicActionKeys.openNewOrSave(), openNewTopicOrSaveTopic);
  const handleNewTopic = () => {
    if (!canCreateTopic || isNewTopicSendInFlight) return;
    // Always navigate to the bare agent chat URL — drops any sub-route
    // (/profile, /channel, /page, /cron/:cronId, …) and any `:topicId`
    // segment so the new topic isn't conflated with the previous URL.
    if (agentId) {
      router.push(urlJoin('/agent', agentId));
    }
    mutate();
  };

  return (
    <Flexbox gap={1} paddingInline={4}>
      <NavItem
        disabled={!canCreateTopic || isNewTopicSendInFlight}
        icon={MessageSquarePlusIcon}
        title={tTopic('actions.addNewTopic')}
        onClick={handleNewTopic}
      />
      <NavItem
        icon={SearchIcon}
        title={t('tab.search')}
        onClick={() => {
          toggleCommandMenu(true);
        }}
      />
    </Flexbox>
  );
});

export default Nav;
