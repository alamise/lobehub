import useSWR from 'swr';

import { userService } from '@/services/user';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

export const SYSTEM_ADMIN_STATE_KEY = 'user-system-admin-state';

export const useAdminAccountState = (): { isAdmin: boolean; isLoading: boolean } => {
  const sessionIsAdmin = useUserStore(userProfileSelectors.isAdminAccount);
  const { data, isLoading } = useSWR(SYSTEM_ADMIN_STATE_KEY, () =>
    userService.getSystemAdminState(),
  );

  return {
    isAdmin: Boolean(data?.isSystemAdmin || sessionIsAdmin),
    isLoading: isLoading && !sessionIsAdmin,
  };
};

export const useIsAdminAccount = (): boolean => useAdminAccountState().isAdmin;
