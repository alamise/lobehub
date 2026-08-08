'use client';

import { Center, Flexbox, Icon, Text } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { ChevronRight } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useLocation } from 'react-router';

import { useIsAdminAccount } from '@/business/client/hooks/useIsAdminAccount';
import {
  type BusinessNavGroup,
  businessNavGroups,
  type BusinessNavLeafItem,
  businessNavMiddleItems,
  businessNavOfficeGroup,
  businessNavTopItems,
  SHARED_AGENT_PATH,
} from '@/features/BusinessNavigation/config';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

const styles = createStaticStyles(({ css }) => ({
  childItem: css`
    cursor: pointer;

    display: flex;
    align-items: center;

    width: 100%;
    min-height: 36px;
    padding-block: 7px;
    padding-inline: 48px 12px;
    border: 0;
    border-radius: 10px;

    font-size: 14px;
    font-weight: 600;
    color: #8fa0ba;
    text-align: start;

    background: transparent;

    transition:
      color 0.18s ease,
      background 0.18s ease;

    &:hover {
      color: #d7e3f3;
      background: rgb(255 255 255 / 6%);
    }

    &[data-active='true'] {
      color: #35d39f;
      background: rgb(16 185 129 / 10%);
    }
  `,
  groupChildren: css`
    display: flex;
    flex-direction: column;
    gap: 4px;

    padding-block: 4px 6px;
    padding-inline: 0;
  `,
  menuButton: css`
    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;
    min-height: 46px;
    padding-block: 0;
    padding-inline: 16px;
    border: 0;
    border-radius: 12px;

    color: #92a2ba;
    text-align: start;

    background: transparent;

    transition:
      color 0.18s ease,
      background 0.18s ease,
      transform 0.18s ease;

    &:hover {
      color: #fff;
      background: rgb(255 255 255 / 7%);
    }

    &[data-active='true'] {
      color: #fff;
      background: #0b9f70;
      box-shadow: 0 10px 22px rgb(0 0 0 / 14%);
    }
  `,
  nav: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;

    min-height: 100%;
    padding-block: 28px;
    padding-inline: 18px;

    background: #0f1b2d;
  `,
  rowIcon: css`
    flex: none;
    width: 20px;
    color: currentcolor;
  `,
}));

const normalizePathname = (pathname: string) => {
  const withoutTrailingSlash =
    pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return withoutTrailingSlash || '/';
};

const isActivePath = (pathname: string, targetPath?: string) => {
  if (!targetPath) return false;
  const current = normalizePathname(pathname);

  if (targetPath === '/') return current === '/';
  if (targetPath === SHARED_AGENT_PATH) {
    return current === targetPath || current.startsWith(`${targetPath}/`);
  }

  return current === targetPath || current.startsWith(`${targetPath}/`);
};

const BusinessMenuLeaf = memo<{ item: BusinessNavLeafItem; nested?: boolean }>(
  ({ item, nested }) => {
    const { pathname } = useLocation();
    const navigate = useWorkspaceAwareNavigate();
    const active = isActivePath(pathname, item.path);

    if (nested) {
      return (
        <button
          className={styles.childItem}
          data-active={active}
          title={item.title}
          type="button"
          onClick={item.path ? () => navigate(item.path) : undefined}
        >
          {item.title}
        </button>
      );
    }

    const ItemIcon = item.icon;

    return (
      <button
        className={styles.menuButton}
        data-active={active}
        title={item.title}
        type="button"
        onClick={item.path ? () => navigate(item.path) : undefined}
      >
        <Flexbox horizontal align="center" gap={12} style={{ minWidth: 0 }}>
          {ItemIcon && (
            <Center className={styles.rowIcon}>
              <Icon icon={ItemIcon} size={18} />
            </Center>
          )}
          <Text ellipsis color="currentColor" fontSize={16} weight={700}>
            {item.title.replaceAll(' ', '')}
          </Text>
        </Flexbox>
      </button>
    );
  },
);

BusinessMenuLeaf.displayName = 'BusinessMenuLeaf';

const BusinessMenuGroup = memo<{ group: BusinessNavGroup }>(({ group }) => {
  const { pathname } = useLocation();
  const navigate = useWorkspaceAwareNavigate();
  const isGroupActive = group.items.some((item) => isActivePath(pathname, item.path));
  const [expanded, setExpanded] = useState(isGroupActive);
  const GroupIcon = group.icon;

  const firstPath = group.items[0]?.path;
  const children = useMemo(
    () => group.items.map((item) => <BusinessMenuLeaf nested item={item} key={item.key} />),
    [group.items],
  );

  return (
    <div>
      <button
        className={styles.menuButton}
        data-active={false}
        title={group.title}
        type="button"
        onClick={() => {
          setExpanded((value) => !value);
          if (!isGroupActive && firstPath) navigate(firstPath);
        }}
      >
        <Flexbox horizontal align="center" gap={12} style={{ minWidth: 0 }}>
          <Center className={styles.rowIcon}>
            <Icon icon={GroupIcon} size={18} />
          </Center>
          <Text ellipsis color="currentColor" fontSize={16} weight={700}>
            {group.title.replaceAll(' ', '')}
          </Text>
        </Flexbox>
        <Icon
          color="currentColor"
          icon={ChevronRight}
          size={18}
          style={{
            flex: 'none',
            transform: expanded ? 'rotate(90deg)' : undefined,
            transition: 'transform 0.18s ease',
          }}
        />
      </button>
      {expanded && <div className={styles.groupChildren}>{children}</div>}
    </div>
  );
});

BusinessMenuGroup.displayName = 'BusinessMenuGroup';

const Body = memo(() => {
  const isAdmin = useIsAdminAccount();
  const docFormatAgentId = useServerConfigStore(serverConfigSelectors.businessDocFormatAgentId);
  const visibleItems = (item: BusinessNavLeafItem) => !item.adminOnly || isAdmin;

  // 公文格式调整菜单项跳转路由取自业务智能体配置（businessAgent.docFormatAgentId），
  // 复用现有智能体配置读取方案，不再在代码中写死路径。
  const officeGroup = useMemo<BusinessNavGroup>(() => {
    if (!docFormatAgentId) return businessNavOfficeGroup;

    const docFormatPath = `/agent/${docFormatAgentId}`;
    return {
      ...businessNavOfficeGroup,
      items: businessNavOfficeGroup.items.map((item) =>
        item.key === 'office-document-format' ? { ...item, path: docFormatPath } : item,
      ),
    };
  }, [docFormatAgentId]);

  return (
    <nav className={styles.nav}>
      {businessNavTopItems.filter(visibleItems).map((item) => (
        <BusinessMenuLeaf item={item} key={item.key} />
      ))}
      {businessNavGroups.map((group) => (
        <BusinessMenuGroup group={group} key={group.key} />
      ))}
      {businessNavMiddleItems.filter(visibleItems).map((item) => (
        <BusinessMenuLeaf item={item} key={item.key} />
      ))}
      <BusinessMenuGroup group={officeGroup} />
    </nav>
  );
});

export default Body;
