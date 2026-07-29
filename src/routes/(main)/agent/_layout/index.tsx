import { Flexbox } from '@lobehub/ui';
import { type FC } from 'react';
import { Outlet } from 'react-router';

import { isDesktop } from '@/const/version';
import { AgentNotFoundGuard } from '@/features/AgentNotFound';
import ProtocolUrlHandler from '@/features/ProtocolUrlHandler';
import { useInitAgentConfig } from '@/hooks/useInitAgentConfig';
import AgentIdSync from '@/routes/(main)/agent/_layout/AgentIdSync';

import PortalAutoCollapse from './PortalAutoCollapse';
import RegisterHotkeys from './RegisterHotkeys';
import Sidebar from './Sidebar';
import AgentSidebarContent from './Sidebar/Content';
import { styles } from './style';

const Layout: FC = () => {
  useInitAgentConfig();

  return (
    <>
      <Sidebar />
      <Flexbox horizontal className={styles.mainContainer} flex={1} height={'100%'}>
        {/* 会话列表：业务导航（NavPanel）之外，详情页内容区左侧保留 lobehub
            原生会话/话题列表，便于在 AI 数字人会话间切换 */}
        <Flexbox className={styles.conversationList}>
          <AgentSidebarContent />
        </Flexbox>
        {/* Keep the sidebar interactive when the routed agent is gone (deleted
            or made private) — only the content area collapses to the 404 card. */}
        <Flexbox className={styles.chatArea} flex={1} height={'100%'}>
          <AgentNotFoundGuard>
            <Outlet />
          </AgentNotFoundGuard>
        </Flexbox>
      </Flexbox>
      <RegisterHotkeys />
      {isDesktop && <ProtocolUrlHandler />}
      <AgentIdSync />
      <PortalAutoCollapse />
    </>
  );
};

export default Layout;
