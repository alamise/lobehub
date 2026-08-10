import { LOBE_CHAT_CLOUD, UTM_SOURCE } from '@lobechat/business-const';
import { OFFICIAL_URL } from '@lobechat/const';
import { CircleUserRound, Cloudy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import useBusinessMeCells from '@/business/client/features/User/useBusinessMeCells';
import { type CellProps } from '@/components/Cell';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

export const useCategory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'setting', 'auth']);
  const { showCloudPromotion } = useServerConfigStore(featureFlagsSelectors);
  const [isLoginWithAuth] = useUserStore((s) => [authSelectors.isLoginWithAuth(s)]);
  const businessMeCells = useBusinessMeCells();

  const profile: CellProps[] = [
    {
      icon: CircleUserRound,
      key: 'profile',
      label: t('userPanel.profile'),
      onClick: () => navigate('/me/profile'),
    },
  ];

  const helps: CellProps[] = [
    showCloudPromotion && {
      icon: Cloudy,
      key: 'cloud',
      label: t('userPanel.cloud', { name: LOBE_CHAT_CLOUD }),
      onClick: () => window.open(`${OFFICIAL_URL}?utm_source=${UTM_SOURCE}`, '__blank'),
    },
  ].filter(Boolean) as CellProps[];

  const mainItems = [
    {
      type: 'divider',
    },
    ...(isLoginWithAuth ? profile : []),
    ...(isLoginWithAuth ? businessMeCells : []),
    ...helps,
  ].filter(Boolean) as CellProps[];

  return mainItems;
};
