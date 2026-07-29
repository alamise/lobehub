'use client';

import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Popconfirm, Space, Table, Tooltip, Typography } from 'antd';
import type { MenuProps, TableProps } from 'antd';
import { memo } from 'react';

import type { CaseArchiveItem } from '../api';
import CaseStatusBadge from './CaseStatusBadge';

interface CaseArchiveTableProps {
  archives: CaseArchiveItem[];
  deletingId: number | null;
  loading: boolean;
  onDelete: (archive: CaseArchiveItem) => void;
  onDetail: (archiveId: number) => void;
  onEdit: (archive: CaseArchiveItem) => void;
  onLogCenter: (archiveId: number) => void;
  onRetry: (archive: CaseArchiveItem) => void;
  retryingId: number | null;
}

const formatDate = (value?: string) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('zh-CN', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const CaseArchiveTable = memo(
  ({
    archives,
    deletingId,
    loading,
    onDelete,
    onDetail,
    onEdit,
    onLogCenter,
    onRetry,
    retryingId,
  }: CaseArchiveTableProps) => {
    const columns: TableProps<CaseArchiveItem>['columns'] = [
      {
        dataIndex: 'id',
        ellipsis: true,
        render: (value: number) => (
          <Typography.Text className="font-mono text-xs text-slate-500">{value}</Typography.Text>
        ),
        title: '档案 ID',
        width: 100,
      },
      {
        dataIndex: 'title',
        render: (_: string, record: CaseArchiveItem) => (
          <Button
            className="max-w-full justify-start truncate px-0 font-medium text-slate-700 hover:text-emerald-600"
            icon={<FileTextOutlined className="text-emerald-600" />}
            onClick={() => onDetail(record.id)}
            type="link"
          >
            <span className="truncate">{record.title || '-'}</span>
          </Button>
        ),
        title: '标题',
      },
      {
        dataIndex: 'doc_no',
        ellipsis: true,
        render: (value?: string) => value || '-',
        title: '文号',
        width: 180,
      },
      {
        align: 'center',
        dataIndex: 'page_count',
        render: (value?: number) => (
          <Typography.Text className="text-slate-600">{value ?? 0} 页</Typography.Text>
        ),
        title: '页数',
        width: 90,
      },
      {
        align: 'center',
        dataIndex: 'process_status',
        render: (value?: string) => <CaseStatusBadge status={value} />,
        title: '处理状态',
        width: 130,
      },
      {
        align: 'right',
        dataIndex: 'updated_at',
        render: (value?: string) => (
          <Typography.Text className="text-xs text-slate-400">{formatDate(value)}</Typography.Text>
        ),
        title: '更新时间',
        width: 160,
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'actions',
        render: (_: unknown, record: CaseArchiveItem) => {
          const retryable = ['failed', 'error', 'abnormal'].includes(record.process_status || '');
          const isDeleting = deletingId === record.id;
          const isRetrying = retryingId === record.id;

          const menuItems: MenuProps['items'] = [
            {
              icon: <EyeOutlined />,
              key: 'detail',
              label: '查看详情',
              onClick: () => onDetail(record.id),
            },
            {
              icon: <EditOutlined />,
              key: 'edit',
              label: '编辑',
              onClick: () => onEdit(record),
            },
            {
              icon: <HistoryOutlined />,
              key: 'log',
              label: '查看处理日志',
              onClick: () => onLogCenter(record.id),
            },
          ];

          if (retryable) {
            menuItems.push({
              icon: <ReloadOutlined />,
              key: 'retry',
              label: '重新处理',
              onClick: () => onRetry(record),
            });
          }

          menuItems.push(
            { type: 'divider' },
            {
              danger: true,
              icon: <DeleteOutlined />,
              key: 'delete',
              label: (
                <Popconfirm
                  cancelText="取消"
                  okButtonProps={{ danger: true, loading: isDeleting }}
                  okText="确认删除"
                  onConfirm={() => onDelete(record)}
                  title="删除后该案卷将不再出现在列表中，是否继续？"
                >
                  <span className="block w-full">删除</span>
                </Popconfirm>
              ),
            },
          );

          return (
            <Space size={4}>
              <Tooltip title="查看详情">
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => onDetail(record.id)}
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Tooltip title="编辑">
                <Button
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Tooltip title="查看处理日志">
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => onLogCenter(record.id)}
                  size="small"
                  type="text"
                />
              </Tooltip>
              {retryable ? (
                <Tooltip title="重新处理">
                  <Button
                    icon={<ReloadOutlined spin={isRetrying} />}
                    loading={isRetrying}
                    onClick={() => onRetry(record)}
                    size="small"
                    type="text"
                  />
                </Tooltip>
              ) : null}
              <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
                <Button icon={<EllipsisOutlined />} size="small" type="text" />
              </Dropdown>
            </Space>
          );
        },
        title: '操作',
        width: 180,
      },
    ];

    return (
      <Table
        bordered={false}
        columns={columns}
        dataSource={archives}
        loading={loading}
        pagination={false}
        rowKey="id"
        scroll={{ x: 980 }}
        size="middle"
      />
    );
  },
);

CaseArchiveTable.displayName = 'CaseArchiveTable';

export default CaseArchiveTable;
