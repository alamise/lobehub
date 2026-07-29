'use client';

import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Collapse, Descriptions, Modal, Spin, Tag, Typography } from 'antd';
import { memo } from 'react';

import type { CaseArchiveItem } from '../api';
import CaseStatusBadge from './CaseStatusBadge';

interface CaseDetailModalProps {
  archive: CaseArchiveItem | null;
  loading: boolean;
  onCancel: () => void;
  open: boolean;
}

const CaseDetailModal = memo(({ archive, loading, onCancel, open }: CaseDetailModalProps) => {
  return (
    <Modal
      footer={null}
      open={open}
      title={
        <span className="flex items-center gap-2">
          <FileTextOutlined className="text-emerald-600" />
          案卷详情
        </span>
      }
      width={900}
      onCancel={onCancel}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Spin />
          <span>正在加载案卷详情...</span>
        </div>
      ) : archive ? (
        <div className="space-y-6 py-2">
          <Descriptions
            bordered
            column={{ lg: 3, md: 2, sm: 1, xs: 1 }}
            labelStyle={{ backgroundColor: '#f8fafc', fontWeight: 500, width: 120 }}
            size="small"
          >
            <Descriptions.Item label="档案 ID">{archive.id}</Descriptions.Item>
            <Descriptions.Item label="文号">{archive.doc_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="年度">{archive.year || '-'}</Descriptions.Item>
            <Descriptions.Item label="页数" span={1}>
              {archive.page_count ?? 0} 页
            </Descriptions.Item>
            <Descriptions.Item label="处理状态" span={2}>
              <CaseStatusBadge status={archive.process_status} />
            </Descriptions.Item>
            <Descriptions.Item label="标题" span={3}>
              <Typography.Text strong>{archive.title || '-'}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="分类编码" span={1}>
              {archive.category_code || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="责任人" span={1}>
              {archive.responsible_party || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="部门名称" span={1}>
              {archive.dept_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="附件名称" span={2}>
              {archive.annex_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="PDF 链接" span={1}>
              {archive.pdf_url ? (
                <Typography.Link href={archive.pdf_url} target="_blank">
                  查看源文件
                </Typography.Link>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={3}>
              {archive.remarks || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={1}>
              {archive.create_time
                ? new Date(archive.create_time).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {archive.updated_at
                ? new Date(archive.updated_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>

          <Collapse
            bordered={false}
            items={[
              {
                children: (
                  <pre className="max-h-[360px] overflow-auto rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-700">
                    {JSON.stringify(archive, null, 2)}
                  </pre>
                ),
                extra: <Tag color="default">DEBUG</Tag>,
                key: 'raw',
                label: (
                  <span className="flex items-center gap-2 text-slate-600">
                    <InfoCircleOutlined />
                    原始数据
                  </span>
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </Modal>
  );
});

CaseDetailModal.displayName = 'CaseDetailModal';

export default CaseDetailModal;
