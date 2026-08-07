import { Flexbox, FluentEmoji, Text } from '@lobehub/ui';
import { Button } from '@lobehub/ui/base-ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAdminAccountState } from '@/business/client/hooks/useIsAdminAccount';
import Loading from '@/components/Loading/BrandTextLoading';
import { AgentViewAllPage } from '@/features/AgentViewAll';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

const Forbidden = memo(() => {
  const { t } = useTranslation('error');
  const navigate = useWorkspaceAwareNavigate();

  return (
    <Flexbox align={'center'} justify={'center'} style={{ minHeight: '100%', width: '100%' }}>
      <FluentEmoji emoji={'🚫'} size={64} />
      <h1 style={{ margin: 0 }}>403</h1>
      <Text weight={700}>{t('forbidden.title')}</Text>
      <Text type={'secondary'}>{t('forbidden.desc')}</Text>
      <Button type={'primary'} onClick={() => navigate('/')}>
        {t('forbidden.backHome')}
      </Button>
    </Flexbox>
  );
});

const AdminOnlyAgentsRoute = memo(() => {
  const { isAdmin, isLoading } = useAdminAccountState();

  if (isLoading) return <Loading debugId="AgentsRoute" />;
  if (!isAdmin) return <Forbidden />;

  return <AgentViewAllPage />;
});

export default AdminOnlyAgentsRoute;
