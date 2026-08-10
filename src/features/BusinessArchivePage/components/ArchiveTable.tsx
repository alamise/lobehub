import { EyeOutlined } from '@ant-design/icons';
import { Button } from '@lobehub/ui/base-ui';
import { Table, Tag, Tooltip, Typography } from 'antd';
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

const toAntdOrder = (order: 'asc' | 'desc') =>
  order === 'asc' ? ('ascend' as const) : ('descend' as const);

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
            <Button
              icon={<EyeOutlined />}
              size="small"
              type="link"
              onClick={() => onDetail(row.id)}
            >
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
      <>
        <div className="business-desktop-only">
          <Table<AiArchiveItem>
            columns={columns}
            dataSource={archives}
            loading={loading}
            pagination={false}
            rowKey="id"
            scroll={{ x: 880 }}
            size="middle"
            onChange={handleChange}
          />
        </div>
        <div className="business-mobile-only">
          <div style={{ display: 'grid', gap: 12 }}>
            {loading ? (
              <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-500">
                正在加载档案...
              </div>
            ) : archives.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-500">
                暂无档案记录
              </div>
            ) : (
              archives.map((archive) => (
                <div
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                  key={archive.id}
                  role="button"
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                  tabIndex={0}
                  onClick={() => onDetail(archive.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onDetail(archive.id);
                  }}
                >
                  <Typography.Text strong style={{ display: 'block', fontSize: 15 }}>
                    {archive.title || '无标题档案'}
                  </Typography.Text>
                  <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                    <Typography.Text type="secondary">
                      文件编号：{archive.doc_no || '—'}
                    </Typography.Text>
                    <Typography.Text type="secondary">年度：{archive.year || '—'}</Typography.Text>
                    <Typography.Text type="secondary">
                      页数：{archive.page_count || 0}
                    </Typography.Text>
                    <span>
                      {archive.category_code ? (
                        <Tag>
                          {archive.category_code}
                          {archive.category_name ? ` ${archive.category_name}` : ''}
                        </Tag>
                      ) : (
                        <Tag>未分类</Tag>
                      )}
                    </span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button icon={<EyeOutlined />} size="small" type="primary">
                      查看详情
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  },
);

ArchiveTable.displayName = 'ArchiveTable';
