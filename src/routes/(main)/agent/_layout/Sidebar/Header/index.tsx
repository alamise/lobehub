'use client';

import { type PropsWithChildren } from 'react';
import { memo } from 'react';

import SideBarHeaderLayout from '@/features/NavPanel/SideBarHeaderLayout';

import Agent from './Agent';
import AgentProfileButton from './AgentProfileButton';
import Nav from './Nav';

const HeaderInfo = memo<PropsWithChildren>(() => {
  return (
    <>
      <SideBarHeaderLayout
        left={<Agent />}
        right={<AgentProfileButton />}
        showBack={false}
        showTogglePanelButton={false}
      />
      <Nav />
    </>
  );
});

export default HeaderInfo;
