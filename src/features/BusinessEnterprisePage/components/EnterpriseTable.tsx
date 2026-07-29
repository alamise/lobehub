import { Button, Table, Tag, Tooltip, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
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
          <Button icon={<EyeOutlined />} onClick={() => onDetail(row.id)} size="small" type="link">
            详情
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table<EnterpriseSummary>
      columns={columns}
      dataSource={enterprises}
      loading={loading}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
      size="middle"
    />
  );
});
