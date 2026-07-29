import { Badge } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { memo } from 'react';

const STATUS_MAP: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  pending: { color: 'default', text: '待处理', icon: <ClockCircleOutlined /> },
  processing: { color: 'processing', text: '处理中', icon: <LoadingOutlined /> },
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> },
};

export const ArchiveStatusBadge = memo(({ status }: { status?: string }) => {
  const key = (status || 'pending').toLowerCase();
  const cfg = STATUS_MAP[key] || STATUS_MAP.pending;
  return (
    <Badge
      status={cfg.color as 'default' | 'processing' | 'success' | 'error'}
      text={cfg.text}
    />
  );
});
