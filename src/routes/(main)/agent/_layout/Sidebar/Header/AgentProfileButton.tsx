'use client';

import { ActionIcon } from '@lobehub/ui';
import { BotIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import useSWR from 'swr';
import urlJoin from 'url-join';

import { DESKTOP_HEADER_ICON_SMALL_SIZE } from '@/const/layoutTokens';
import { useQueryRoute } from '@/hooks/useQueryRoute';
import { usePathname } from '@/libs/router/navigation';
import { userService } from '@/services/user';
import { useChatStore } from '@/store/chat';

const AgentProfileButton = memo(() => {
  const { t } = useTranslation('chat');
  const params = useParams();
  const agentId = params.aid;
  const pathname = usePathname();
  const router = useQueryRoute();
  const switchTopic = useChatStore((s) => s.switchTopic);
  const { data: adminState } = useSWR('user-system-admin-state', () =>
    userService.getSystemAdminState(),
  );

  if (!adminState?.isSystemAdmin || !agentId) return null;

  return (
    <ActionIcon
      active={pathname.includes('/profile')}
      icon={BotIcon}
      size={DESKTOP_HEADER_ICON_SMALL_SIZE}
      title={t('tab.profile')}
      tooltipProps={{ placement: 'bottom' }}
      onClick={() => {
        switchTopic(null, { skipRefreshMessage: true });
        router.push(urlJoin('/agent', agentId, 'profile'));
      }}
    />
  );
});

AgentProfileButton.displayName = 'AgentProfileButton';

export default AgentProfileButton;
