import { Button, Table, Tag, Tooltip, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { memo } from 'react';

import type { AiArchiveItem } from '../api';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER } from '../constants';

interface Props {
  archives: AiArchiveItem[];
  loading?: boolean;
  onDetail: (id: number) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

const toAntdOrder = (order: 'asc' | 'desc') => (order === 'asc' ? ('ascend' as const) : ('descend' as const));

export const ArchiveTable = memo<Props>(
  ({ archives, loading, onDetail, onSortChange, sortField, sortOrder }) => {
    const sortableProps = (field: string) => ({
      sortDirections: ['descend', 'ascend'] as ('descend' | 'ascend')[],
      sorter: true,
      sortOrder: sortField === field ? toAntdOrder(sortOrder) : null,
    });

    const columns: ColumnsType<AiArchiveItem> = [
      {
        dataIndex: 'id',
        title: 'ID',
        width: 90,
        ...sortableProps('id'),
      },
      {
        dataIndex: 'title',
        ellipsis: true,
        title: '档案标题',
        render: (value: string) => (
          <Typography.Text strong style={{ fontSize: 14 }}>
            {value || '—'}
          </Typography.Text>
        ),
        ...sortableProps('title'),
      },
      {
        dataIndex: 'doc_no',
        title: '文件编号',
        width: 170,
        render: (v: string) => v || '—',
        ...sortableProps('doc_no'),
      },
      {
        dataIndex: 'page_count',
        title: '页数',
        width: 100,
        render: (v: number) => v || 0,
        ...sortableProps('page_count'),
      },
      {
        dataIndex: 'category_code',
        title: '分类',
        width: 200,
        render: (code: string, row) =>
          code ? (
            <Tag>
              {code}
              {row.category_name ? ` ${row.category_name}` : ''}
            </Tag>
          ) : (
            '—'
          ),
      },
      {
        fixed: 'right',
        title: '操作',
        width: 90,
        render: (_, row) => (
          <Tooltip title="查看详情">
            <Button icon={<EyeOutlined />} onClick={() => onDetail(row.id)} size="small" type="link">
              详情
            </Button>
          </Tooltip>
        ),
      },
    ];

    const handleChange: TableProps<AiArchiveItem>['onChange'] = (_pagination, _filters, sorter) => {
      const single = Array.isArray(sorter) ? sorter[0] : sorter;
      if (single?.column && single.order) {
        onSortChange(String(single.field), single.order === 'ascend' ? 'asc' : 'desc');
      } else {
        // 取消列排序时回到默认复合排序（与旧版默认一致）
        onSortChange(DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER);
      }
    };

    return (
      <Table<AiArchiveItem>
        columns={columns}
        dataSource={archives}
        loading={loading}
        onChange={handleChange}
        pagination={false}
        rowKey="id"
        scroll={{ x: 880 }}
        size="middle"
      />
    );
  },
);

ArchiveTable.displayName = 'ArchiveTable';
