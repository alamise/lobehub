'use client';

import { Accordion, AccordionItem, Flexbox, Icon, Text } from '@lobehub/ui';
import { memo, useMemo } from 'react';
import { useLocation } from 'react-router';

import {
  businessNavGroups,
  businessNavMiddleItems,
  businessNavOfficeGroup,
  businessNavTopItems,
  SHARED_AGENT_PATH,
  type BusinessNavGroup,
  type BusinessNavLeafItem,
} from '@/features/BusinessNavigation/config';
import NavItem from '@/features/NavPanel/components/NavItem';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import WorkspaceLink from '@/features/Workspace/WorkspaceLink';
import { isModifierClick } from '@/utils/navigation';

const defaultExpandedKeys = [
  ...businessNavGroups.map((group) => group.key),
  businessNavOfficeGroup.key,
];

const normalizePathname = (pathname: string) => {
  const withoutTrailingSlash =
    pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return withoutTrailingSlash || '/';
};

const isActivePath = (pathname: string, targetPath: string) => {
  const current = normalizePathname(pathname);

  if (targetPath === '/') return current === '/';
  if (targetPath === SHARED_AGENT_PATH) {
    return current === targetPath || current.startsWith(`${targetPath}/`);
  }

  return current === targetPath || current.startsWith(`${targetPath}/`);
};

const BusinessMenuLink = memo<{ item: BusinessNavLeafItem }>(({ item }) => {
  const { pathname } = useLocation();
  const navigate = useWorkspaceAwareNavigate();
  const active = isActivePath(pathname, item.path);

  return (
    <WorkspaceLink
      to={item.path}
      onClick={(e) => {
        if (isModifierClick(e)) return;
        e.preventDefault();
        navigate(item.path);
      }}
    >
      <NavItem active={active} icon={item.icon} title={item.title} />
    </WorkspaceLink>
  );
});

BusinessMenuLink.displayName = 'BusinessMenuLink';

const BusinessMenuGroup = memo<{ group: BusinessNavGroup }>(({ group }) => {
  const items = useMemo(
    () => group.items.map((item) => <BusinessMenuLink item={item} key={item.key} />),
    [group.items],
  );

  return (
    <AccordionItem
      itemKey={group.key}
      paddingBlock={4}
      paddingInline={'8px 4px'}
      title={
        <Flexbox horizontal align="center" gap={8}>
          <Icon icon={group.icon} size={16} />
          <Text ellipsis fontSize={12} type="secondary" weight={500}>
            {group.title}
          </Text>
        </Flexbox>
      }
    >
      <Flexbox gap={1} paddingBlock={1}>
        {items}
      </Flexbox>
    </AccordionItem>
  );
});

BusinessMenuGroup.displayName = 'BusinessMenuGroup';

const Body = memo(() => (
  <Flexbox flex={1} gap={1} paddingBlock={8} paddingInline={4} style={{ minHeight: '100%' }}>
    {businessNavTopItems.map((item) => (
      <BusinessMenuLink item={item} key={item.key} />
    ))}
    <Accordion defaultExpandedKeys={defaultExpandedKeys} gap={8}>
      {businessNavGroups.map((group) => (
        <BusinessMenuGroup group={group} key={group.key} />
      ))}
    </Accordion>
    {businessNavMiddleItems.map((item) => (
      <BusinessMenuLink item={item} key={item.key} />
    ))}
    <Accordion defaultExpandedKeys={[businessNavOfficeGroup.key]} gap={8}>
      <BusinessMenuGroup group={businessNavOfficeGroup} />
    </Accordion>
  </Flexbox>
));

export default Body;
