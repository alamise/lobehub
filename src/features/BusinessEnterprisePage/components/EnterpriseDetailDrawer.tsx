import { Descriptions, Drawer, Empty, List, Spin, Tabs, Typography } from 'antd';
import { memo, useEffect, useState } from 'react';

import type { EnterpriseArchive, EnterpriseDetail, EnterpriseFactory } from '../api';
import { getEnterpriseArchives } from '../api';

interface Props {
  enterprise: EnterpriseDetail | null;
  loading?: boolean;
  onClose: () => void;
  open: boolean;
}

export const EnterpriseDetailDrawer = memo<Props>(({ enterprise, loading, onClose, open }) => {
  const [archives, setArchives] = useState<EnterpriseArchive[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);

  useEffect(() => {
    if (!open || !enterprise?.id) return;
    setArchivesLoading(true);
    getEnterpriseArchives(enterprise.id)
      .then((res) => setArchives(res.list || []))
      .catch(() => setArchives([]))
      .finally(() => setArchivesLoading(false));
  }, [open, enterprise?.id]);

  const factories: EnterpriseFactory[] = enterprise?.factories || [];

  const archivePanel = (
    <Spin spinning={archivesLoading}>
      {archives.length === 0 ? (
        <Empty description="暂无关联档案" />
      ) : (
        <List
          dataSource={archives}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                description={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.doc_no || '—'} · {item.year || '—'} · {item.category_code || '—'}
                  </Typography.Text>
                }
                title={<span style={{ fontSize: 14 }}>{item.title || '未命名档案'}</span>}
              />
            </List.Item>
          )}
        />
      )}
    </Spin>
  );

  const factoryPanel = (
    <>
      {factories.length === 0 ? (
        <Empty description="暂无厂区信息" />
      ) : (
        <List
          dataSource={factories}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                description={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.region_name || '—'} · {item.address || '—'} · 污染物：{item.pollutant_type || '—'}
                  </Typography.Text>
                }
                title={<span style={{ fontSize: 14 }}>{item.factory_name || '未命名厂区'}</span>}
              />
            </List.Item>
          )}
        />
      )}
    </>
  );

  return (
    <Drawer
      destroyOnClose
      onClose={onClose}
      open={open}
      size="large"
      title={enterprise?.name || '企业详情'}
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spin />
        </div>
      ) : !enterprise ? (
        <Empty description="暂无数据" />
      ) : (
        <div className="space-y-6">
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="企业名称">{enterprise.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="曾用名">{enterprise.former_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="统一社会信用代码">
              {enterprise.enterprise_no || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="法人代表">{enterprise.legal_person || '—'}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{enterprise.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="所属行业">{enterprise.industry || '—'}</Descriptions.Item>
            <Descriptions.Item label="行政区划">{enterprise.region_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="注册地址">{enterprise.address || '—'}</Descriptions.Item>
            <Descriptions.Item label="关联档案数">{enterprise.archive_count || 0}</Descriptions.Item>
          </Descriptions>

          <Tabs
            items={[
              { children: archivePanel, key: 'archives', label: `关联档案 (${archives.length})` },
              { children: factoryPanel, key: 'factories', label: `厂区信息 (${factories.length})` },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
});
