'use client';

import { ActionIcon, Flexbox } from '@lobehub/ui';
import { SettingsIcon } from 'lucide-react';
import { memo } from 'react';
import useSWR from 'swr';

import WorkspaceLink from '@/features/Workspace/WorkspaceLink';
import User from '@/routes/(main)/home/_layout/Header/components/User';
import { userService } from '@/services/user';

/**
 * Unified bottom row for the dark business-nav sidebars (home / agent list).
 * Replaces the old two-row layout (a user-info row + the help/question-mark
 * footer) with a single row: user info on the left, a settings entry on the
 * right, separated by a spacer. The question-mark (help) entry is intentionally
 * dropped here.
 */
const HomeSidebarFooter = memo(() => {
  const { data: adminState } = useSWR('user-system-admin-state', () =>
    userService.getSystemAdminState(),
  );

  return (
    <Flexbox
      horizontal
      align="center"
      justify="space-between"
      padding={12}
      style={{
        background: '#0f1b2d',
        borderTop: '1px solid rgb(148 163 184 / 16%)',
        flex: 'none',
      }}
    >
      <User dark />
      {adminState?.isSystemAdmin && (
        <WorkspaceLink to="/settings">
          <ActionIcon
            aria-label={'settings'}
            icon={SettingsIcon}
            size={18}
            style={{ color: '#9fb0c8' }}
          />
        </WorkspaceLink>
      )}
    </Flexbox>
  );
});

export default HomeSidebarFooter;
