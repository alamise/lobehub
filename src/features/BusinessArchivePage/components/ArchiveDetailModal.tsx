import { Descriptions, Drawer, Empty, Spin, Typography } from 'antd';
import { memo } from 'react';

import { ArchiveStatusBadge } from './ArchiveStatusBadge';
import type { AiArchiveItem } from '../api';

interface Props {
  archive: AiArchiveItem | null;
  loading?: boolean;
  onClose: () => void;
  open: boolean;
}

export const ArchiveDetailModal = memo<Props>(({ archive, loading, onClose, open }) => (
  <Drawer
    destroyOnClose
    onClose={onClose}
    open={open}
    size="large"
    title={archive?.title || '档案详情'}
  >
    {loading ? (
      <div className="flex h-48 items-center justify-center">
        <Spin />
      </div>
    ) : !archive ? (
      <Empty description="暂无数据" />
    ) : (
      <div className="space-y-6">
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="档案标题">{archive.title || '—'}</Descriptions.Item>
          <Descriptions.Item label="文件编号">{archive.doc_no || '—'}</Descriptions.Item>
          <Descriptions.Item label="年度">{archive.year || '—'}</Descriptions.Item>
          <Descriptions.Item label="档案分类">
            {archive.category_name || archive.category_code || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="责任方">{archive.responsible_party || '—'}</Descriptions.Item>
          <Descriptions.Item label="处理状态">
            <ArchiveStatusBadge status={archive.process_status} />
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{archive.create_time || '—'}</Descriptions.Item>
        </Descriptions>

        <div>
          <Typography.Title level={5}>AI 导读</Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {archive.ai_guide || '暂无导读内容'}
          </Typography.Paragraph>
        </div>
      </div>
    )}
  </Drawer>
));
