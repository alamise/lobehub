import { memo } from 'react';
import { Link, useLocation } from 'react-router';

import { SHARED_AGENT_PATH } from '@/features/BusinessNavigation/config';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

import ListItem from '../ListItem';

const Inbox = memo(() => {
  const { pathname } = useLocation();
  const navigate = useWorkspaceAwareNavigate();
  const active = pathname === SHARED_AGENT_PATH || pathname.startsWith(`${SHARED_AGENT_PATH}/`);

  return (
    <Link
      aria-label={'AI数字人'}
      to={SHARED_AGENT_PATH}
      onClick={(e) => {
        e.preventDefault();
        navigate(SHARED_AGENT_PATH);
      }}
    >
      <ListItem
        active={active}
        avatar={'/avatar.png'}
        key={'inbox'}
        title={'AI数字人'}
        styles={{
          container: {
            gap: 12,
          },
          content: {
            gap: 6,
            maskImage: `linear-gradient(90deg, #000 90%, transparent)`,
          },
        }}
      />
    </Link>
  );
});

export default Inbox;
