import React, { memo } from 'react';

import { NavPanelPortal } from '@/features/NavPanel';

import SidebarContent from '../../../home/_layout/SidebarContent';

const Sidebar = memo(() => {
  return (
    <NavPanelPortal navKey="agent">
      <SidebarContent />
    </NavPanelPortal>
  );
});

Sidebar.displayName = 'ChatSidebar';

export default Sidebar;
