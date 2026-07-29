'use client';

import { Center, Flexbox, Icon, Text } from '@lobehub/ui';
import { createStaticStyles, cssVar } from 'antd-style';
import { FileText } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useLocation } from 'react-router';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { findBusinessNavItemByPath } from '@/features/BusinessNavigation/config';

const styles = createStaticStyles(({ css }) => ({
  page: css`
    min-height: 100%;
    padding: 48px 40px;
  `,
  placeholder: css`
    width: min(760px, 100%);
  `,
  iconWrap: css`
    width: 56px;
    height: 56px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorBgContainer};
  `,
}));

const normalizeBusinessPath = (pathname: string, activeWorkspaceSlug?: string | null) => {
  const segments = pathname.split('/').filter(Boolean);

  if (activeWorkspaceSlug && segments[0] === activeWorkspaceSlug) {
    const withoutWorkspace = segments.slice(1);
    return withoutWorkspace.length > 0 ? `/${withoutWorkspace.join('/')}` : '/';
  }

  return pathname;
};

const BusinessPlaceholderPage = memo(() => {
  const { pathname } = useLocation();
  const activeWorkspaceSlug = useActiveWorkspaceSlug();
  const normalizedPath = useMemo(
    () => normalizeBusinessPath(pathname, activeWorkspaceSlug),
    [pathname, activeWorkspaceSlug],
  );
  const item = findBusinessNavItemByPath(normalizedPath);
  const title = item?.title ?? '业务页面';
  const PageIcon = item?.icon ?? FileText;

  return (
    <Center className={styles.page}>
      <Flexbox align="center" className={styles.placeholder} gap={16}>
        <Center className={styles.iconWrap}>
          <Icon icon={PageIcon} size={28} />
        </Center>
        <Flexbox align="center" gap={8}>
          <Text fontSize={28} weight={600}>
            {title}
          </Text>
          <Text type="secondary">页面已预留，后续在这里完善业务内容。</Text>
        </Flexbox>
      </Flexbox>
    </Center>
  );
});

BusinessPlaceholderPage.displayName = 'BusinessPlaceholderPage';

export default BusinessPlaceholderPage;
