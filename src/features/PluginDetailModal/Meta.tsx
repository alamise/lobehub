import { Block, Flexbox, Text } from '@lobehub/ui';
import { App, Switch } from 'antd';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import PluginAvatar from '@/features/PluginAvatar';
import { userService } from '@/services/user';
import { pluginHelpers, useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/selectors';

const Meta = memo<{
  id: string;
}>(({ id }) => {
  const { t } = useTranslation('plugin');
  const { message } = App.useApp();
  const pluginMeta = useToolStore(pluginSelectors.getPluginMetaById(id), isEqual);
  const installedPlugin = useToolStore(pluginSelectors.getInstalledPluginById(id), isEqual);
  const setPluginShared = useToolStore((s) => s.setPluginShared);
  const { data: adminState } = useSWR('user-system-admin-state', () =>
    userService.getSystemAdminState(),
  );
  const isShared = !!(installedPlugin?.customParams as Record<string, unknown> | undefined)
    ?.yuxiaohuanGlobalShared;

  return (
    <Block horizontal gap={16} padding={16} variant={'outlined'}>
      <PluginAvatar identifier={id} size={40} />
      <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
        <Flexbox horizontal align={'center'} gap={8} justify={'space-between'}>
          <div>{pluginHelpers.getPluginTitle(pluginMeta)}</div>
          {adminState?.isSystemAdmin && installedPlugin && (
            <Switch
              checked={isShared}
              checkedChildren={t('detailModal.shared', 'Shared')}
              size="small"
              unCheckedChildren={t('detailModal.private', 'Private')}
              onChange={async (checked) => {
                try {
                  await setPluginShared(id, checked);
                  message.success(
                    checked
                      ? t('detailModal.shareSuccess', 'Plugin shared')
                      : t('detailModal.unshareSuccess', 'Plugin unshared'),
                  );
                } catch {
                  message.error(t('detailModal.shareFailed', 'Failed to update sharing'));
                }
              }}
            />
          )}
        </Flexbox>
        <Text style={{ fontSize: 12 }} type={'secondary'}>
          {pluginHelpers.getPluginDesc(pluginMeta)}
        </Text>
      </Flexbox>
    </Block>
  );
});

export default Meta;
