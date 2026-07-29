'use client';

import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DatabaseOutlined, FileSearchOutlined, ScissorOutlined, SyncOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { memo, useMemo } from 'react';

export type CaseProcessStatus =
  | 'completed'
  | 'splitting'
  | 'ocr_processing'
  | 'indexing'
  | 'failed'
  | 'error'
  | 'abnormal'
  | string;

interface StatusMeta {
  color: string;
  icon: React.ReactNode;
  label: string;
  pulse?: boolean;
}

const statusMetaMap: Record<string, StatusMeta> = {
  abnormal: {
    color: 'red',
    icon: <CloseCircleOutlined />,
    label: '异常',
  },
  completed: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    label: '已完成',
  },
  error: {
    color: 'red',
    icon: <CloseCircleOutlined />,
    label: '错误',
  },
  failed: {
    color: 'red',
    icon: <CloseCircleOutlined />,
    label: '失败',
  },
  indexing: {
    color: 'geekblue',
    icon: <DatabaseOutlined />,
    label: '入库中',
    pulse: true,
  },
  ocr_processing: {
    color: 'blue',
    icon: <FileSearchOutlined />,
    label: 'OCR 中',
    pulse: true,
  },
  splitting: {
    color: 'gold',
    icon: <ScissorOutlined />,
    label: '拆分中',
    pulse: true,
  },
};

interface CaseStatusBadgeProps {
  status?: CaseProcessStatus;
}

const CaseStatusBadge = memo(({ status }: CaseStatusBadgeProps) => {
  const meta = useMemo<StatusMeta>(() => {
    if (status && statusMetaMap[status]) return statusMetaMap[status];
    return {
      color: 'default',
      icon: <ClockCircleOutlined />,
      label: '待处理',
    };
  }, [status]);

  return (
    <Tag
      color={meta.color}
      icon={meta.pulse ? <SyncOutlined spin /> : meta.icon}
      style={{ fontWeight: 500 }}
    >
      {meta.label}
    </Tag>
  );
});

CaseStatusBadge.displayName = 'CaseStatusBadge';

export default CaseStatusBadge;
