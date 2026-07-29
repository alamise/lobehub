'use client';

import { FileTextOutlined, CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { memo, useMemo } from 'react';

import type { CaseArchiveItem } from '../api';

interface HeaderStatsProps {
  archives: CaseArchiveItem[];
  total: number;
}

const HeaderStats = memo(({ archives, total }: HeaderStatsProps) => {
  const stats = useMemo(() => {
    const completed = archives.filter((item) => item.process_status === 'completed').length;
    const processing = archives.filter((item) =>
      ['splitting', 'ocr_processing', 'indexing'].includes(item.process_status || ''),
    ).length;
    const failed = archives.filter((item) =>
      ['failed', 'error', 'abnormal'].includes(item.process_status || ''),
    ).length;
    return { completed, failed, processing };
  }, [archives]);

  return (
    <div className="space-y-2">
      <div>
        <Typography.Title level={3} className="!mb-1">
          AI 案卷
        </Typography.Title>
        <Typography.Text type="secondary">案卷上传、处理状态追踪与处理日志查看</Typography.Text>
      </div>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={12} sm={12} md={6}>
          <Card size="small" bordered={false} className="bg-slate-50">
            <Statistic
              prefix={<FileTextOutlined className="text-blue-500" />}
              title="案卷总数"
              value={total}
              valueStyle={{ color: '#1f2937', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" bordered={false} className="bg-green-50">
            <Statistic
              prefix={<CheckCircleOutlined className="text-green-500" />}
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#16a34a', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" bordered={false} className="bg-amber-50">
            <Statistic
              prefix={<SyncOutlined className="text-amber-500" />}
              title="处理中"
              value={stats.processing}
              valueStyle={{ color: '#d97706', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" bordered={false} className="bg-red-50">
            <Statistic
              prefix={<ExclamationCircleOutlined className="text-red-500" />}
              title="失败 / 异常"
              value={stats.failed}
              valueStyle={{ color: '#dc2626', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
});

HeaderStats.displayName = 'HeaderStats';

export default HeaderStats;
