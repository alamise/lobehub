import { EyeOutlined } from '@ant-design/icons';
import { Button } from '@lobehub/ui/base-ui';
import { Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { memo } from 'react';

import type { EnterpriseSummary } from '../api';

interface Props {
  enterprises: EnterpriseSummary[];
  loading?: boolean;
  onDetail: (id: number) => void;
}

export const EnterpriseTable = memo<Props>(({ enterprises, loading, onDetail }) => {
  const columns: ColumnsType<EnterpriseSummary> = [
    {
      dataIndex: 'name',
      ellipsis: true,
      title: '企业名称',
      render: (value: string) => (
        <Typography.Text strong style={{ fontSize: 14 }}>
          {value || '—'}
        </Typography.Text>
      ),
    },
    {
      dataIndex: 'enterprise_no',
      title: '统一社会信用代码',
      width: 200,
      render: (v: string) => v || '—',
    },
    { dataIndex: 'legal_person', title: '法人代表', width: 120, render: (v: string) => v || '—' },
    { dataIndex: 'phone', title: '联系电话', width: 140, render: (v: string) => v || '—' },
    { dataIndex: 'industry', title: '行业', width: 140, render: (v: string) => v || '—' },
    {
      dataIndex: 'archive_count',
      title: '关联档案',
      width: 100,
      render: (v: number) => <Tag color="blue">{v || 0}</Tag>,
    },
    {
      fixed: 'right',
      title: '操作',
      width: 90,
      render: (_, row) => (
        <Tooltip title="企业详情">
          <Button icon={<EyeOutlined />} size="small" type="link" onClick={() => onDetail(row.id)}>
            详情
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <div className="business-desktop-only">
        <Table<EnterpriseSummary>
          columns={columns}
          dataSource={enterprises}
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: 900 }}
          size="middle"
        />
      </div>
      <div className="business-mobile-only">
        <div style={{ display: 'grid', gap: 12 }}>
          {loading ? (
            <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-500">
              正在加载企业...
            </div>
          ) : enterprises.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-500">
              暂无企业记录
            </div>
          ) : (
            enterprises.map((enterprise) => (
              <div
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                key={enterprise.id}
                role="button"
                style={{ cursor: 'pointer' }}
                tabIndex={0}
                onClick={() => onDetail(enterprise.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onDetail(enterprise.id);
                }}
              >
                <Typography.Text strong style={{ display: 'block', fontSize: 15 }}>
                  {enterprise.name || '未命名企业'}
                </Typography.Text>
                <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                  <Typography.Text type="secondary">
                    信用代码：{enterprise.enterprise_no || '—'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    法人代表：{enterprise.legal_person || '—'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    联系电话：{enterprise.phone || '—'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    行业：{enterprise.industry || '—'}
                  </Typography.Text>
                  <span>
                    <Tag color="blue">关联档案 {enterprise.archive_count || 0}</Tag>
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Button icon={<EyeOutlined />} size="small" type="primary">
                    企业详情
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
});
