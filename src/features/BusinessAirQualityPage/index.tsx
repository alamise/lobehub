'use client';

import { Card, Typography } from 'antd';
import { FundOutlined, RobotOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';

import { MiniBarChart } from '@/features/BusinessCharts';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const AIR_QUALITY = [
  { time: '08:00', aqi: 45, pm25: 25, o3: 50 },
  { time: '10:00', aqi: 52, pm25: 30, o3: 65 },
  { time: '12:00', aqi: 65, pm25: 35, o3: 90 },
  { time: '14:00', aqi: 70, pm25: 38, o3: 110 },
  { time: '16:00', aqi: 55, pm25: 28, o3: 85 },
];

const BusinessAirQualityPage = memo(() => {
  const avgAQI = useMemo(
    () => Math.round(AIR_QUALITY.reduce((sum, item) => sum + item.aqi, 0) / AIR_QUALITY.length),
    [],
  );

  const barData = useMemo(
    () => AIR_QUALITY.map((row) => ({ label: row.time, value: row.aqi })),
    [],
  );
  const pmData = useMemo(
    () => AIR_QUALITY.map((row) => ({ label: row.time, value: row.pm25 })),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <FundOutlined style={{ fontSize: 22 }} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            气环境质量分析
          </Typography.Title>
          <Typography.Text type="secondary">重要站点空气质量指数（AQI）趋势分析</Typography.Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: '站点', value: '良渚文明探索营地站' },
          { label: '时间范围', value: '近12个月' },
          { label: '平均AQI', value: String(avgAQI) },
        ].map((item) => (
          <Card key={item.label} bordered={false} className="shadow-sm">
            <div className="mb-1 text-xs text-slate-500">{item.label}</div>
            <div className="text-base font-medium text-slate-800">{item.value}</div>
          </Card>
        ))}
      </div>

      <Card bordered={false} className="shadow-sm" title="AQI 趋势">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-600">AQI 指数</div>
            <MiniBarChart data={barData} colors={['#10b981']} height={260} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-600">PM2.5 (μg/m³)</div>
            <MiniBarChart data={pmData} colors={['#64748b']} height={260} />
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 p-4">
        <div className="rounded-full bg-white p-2 text-teal-600 shadow-sm">
          <RobotOutlined style={{ fontSize: 20 }} />
        </div>
        <div>
          <Typography.Title className="!mb-1" level={5}>
            AI 智能分析
          </Typography.Title>
          <Typography.Paragraph className="!mb-0 text-sm leading-relaxed text-teal-800/80">
            下午14:00左右O3浓度出现峰值，建议加强对闲林工业园区的VOCs无组织排放巡查。预计明日降雨，空气质量将进一步改善。
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  );
});

BusinessAirQualityPage.displayName = 'BusinessAirQualityPage';

const BusinessAirQualityPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessAirQualityPage />
  </BusinessPageContainer>
));

BusinessAirQualityPageWithContainer.displayName = 'BusinessAirQualityPageWithContainer';

export default BusinessAirQualityPageWithContainer;
