'use client';

import { Card, Tabs, Typography } from 'antd';
import { Siren } from 'lucide-react';
import { memo } from 'react';

import EmrArchiveList from './components/EmrArchiveList';
import ExpertManager from './components/ExpertManager';
import MaterialManager from './components/MaterialManager';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const BusinessEmergencyPage = memo(() => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
        <Siren size={22} />
      </div>
      <div>
        <Typography.Title className="!mb-0" level={3}>
          AI 应急
        </Typography.Title>
        <Typography.Text type="secondary">应急档案与预案知识检索、物资与专家管理</Typography.Text>
      </div>
    </div>

    <Card bordered={false} className="shadow-sm">
      <Tabs
        items={[
          { children: <EmrArchiveList />, key: 'archives', label: '应急档案检索' },
          { children: <MaterialManager />, key: 'materials', label: '应急物资' },
          { children: <ExpertManager />, key: 'experts', label: '应急专家' },
        ]}
      />
    </Card>
  </div>
));

BusinessEmergencyPage.displayName = 'BusinessEmergencyPage';

const BusinessEmergencyPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessEmergencyPage />
  </BusinessPageContainer>
));

BusinessEmergencyPageWithContainer.displayName = 'BusinessEmergencyPageWithContainer';

export default BusinessEmergencyPageWithContainer;
