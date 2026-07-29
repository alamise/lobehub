'use client';

import { Button, Card, Input, Select, Table, Typography, message } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { memo, useState } from 'react';

import { MiniBarChart, MiniPieChart, type PieDatum } from '@/features/BusinessCharts';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const INDUSTRIES = [
  { label: '全部行业', value: 'all' },
  { label: '化工', value: 'chemical' },
  { label: '印染', value: 'printing' },
  { label: '电镀', value: 'electroplating' },
  { label: '其他', value: 'other' },
];

const TOWNS = [
  { label: '仓前街道', value: '仓前街道' },
  { label: '闲林街道', value: '闲林街道' },
  { label: '余杭街道', value: '余杭街道' },
  { label: '良渚街道', value: '良渚街道' },
  { label: '瓶窑镇', value: '瓶窑镇' },
  { label: '径山镇', value: '径山镇' },
  { label: '黄湖镇', value: '黄湖镇' },
  { label: '鸬鸟镇', value: '鸬鸟镇' },
];

const DATA_TYPES = [
  { label: '环评', value: 'eia' },
  { label: '三同时验收', value: 'three_acceptance' },
  { label: '排污许可证', value: 'permit' },
  { label: '信访', value: 'complaint' },
  { label: '行政处罚', value: 'penalty' },
  { label: '危险废物', value: 'haz_waste' },
  { label: '应急物资', value: 'emergency_supplies' },
  { label: '空气质量', value: 'air_quality' },
];

const BAR_DATA = [
  { label: '仓前街道', value: 45 },
  { label: '闲林街道', value: 32 },
  { label: '余杭街道', value: 28 },
  { label: '良渚街道', value: 51 },
];

const PIE_DATA: PieDatum[] = [
  { color: '#10b981', label: '化工', value: 45 },
  { color: '#3b82f6', label: '印染', value: 32 },
  { color: '#f59e0b', label: '电镀', value: 28 },
  { color: '#ef4444', label: '其他', value: 51 },
];

const TABLE_DATA = [
  { count: 45, label: '仓前街道', percent: 28.8 },
  { count: 32, label: '闲林街道', percent: 20.5 },
  { count: 28, label: '余杭街道', percent: 17.9 },
  { count: 51, label: '良渚街道', percent: 32.7 },
];

const HISTORY_LIST = [
  { id: 1, result: '共156条', scope: '余杭街道、闲林街道', time: '2026-03-01 14:30', user: '张三' },
  { id: 2, result: '共89条', scope: '全区化工行业', time: '2026-02-28 10:15', user: '李四' },
  { id: 3, result: '共67条', scope: '良渚街道', time: '2026-02-25 16:45', user: '王五' },
];

const BusinessStatisticsPage = memo(() => {
  const [industry, setIndustry] = useState('all');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [towns, setTowns] = useState<string[]>([]);
  const [enterprise, setEnterprise] = useState('');
  const [dataType, setDataType] = useState('complaint');
  const [aiDescription, setAiDescription] = useState('');

  const handleCompute = () => {
    message.success('已生成统计结果（示例数据）');
  };

  const handleReset = () => {
    setIndustry('all');
    setStartDate('2026-01-01');
    setEndDate('2026-03-31');
    setTowns([]);
    setEnterprise('');
    setDataType('complaint');
    setAiDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <BarChartOutlined style={{ fontSize: 22 }} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            AI 统计
          </Typography.Title>
          <Typography.Text type="secondary">针对镇街、行业、企业等各类数据智能统计</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm" title="统计条件">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="mb-1 text-sm text-slate-600">行业</div>
            <Select className="w-full" options={INDUSTRIES} value={industry} onChange={setIndustry} />
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-sm text-slate-600">开始日期</div>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-sm text-slate-600">结束日期</div>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-sm text-slate-600">镇街（可多选）</div>
            <Select
              className="w-full"
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              options={TOWNS}
              placeholder="请选择镇街"
              value={towns}
              onChange={setTowns}
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-1 text-sm text-slate-600">企业（名称/统一社会信用代码）</div>
            <Input
              placeholder="请输入企业名称"
              value={enterprise}
              onChange={(e) => setEnterprise(e.target.value)}
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-1 text-sm text-slate-600">数据类型</div>
            <Select className="w-full" options={DATA_TYPES} value={dataType} onChange={setDataType} />
          </div>
          <div className="md:col-span-12">
            <div className="mb-1 text-sm text-slate-600">AI 统计需求说明</div>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="请描述需要统计的维度、指标与输出形式，例如：按镇街统计近三个月信访件数量并排名"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-12">
            <Button type="primary" onClick={handleCompute}>
              AI 统计
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card bordered={false} className="shadow-sm" title="各镇街数量分布">
          <MiniBarChart data={BAR_DATA} height={260} />
        </Card>
        <Card bordered={false} className="shadow-sm" title="行业占比">
          <MiniPieChart data={PIE_DATA} height={260} />
        </Card>
      </div>

      <Card bordered={false} className="shadow-sm" title="统计结果">
        <Table
          columns={[
            { dataIndex: 'label', key: 'label', title: '镇街' },
            { dataIndex: 'count', key: 'count', title: '数量' },
            {
              dataIndex: 'percent',
              key: 'percent',
              render: (v: number) => `${v.toFixed(1)}%`,
              title: '占比',
            },
          ]}
          dataSource={TABLE_DATA.map((d) => ({ ...d, key: d.label }))}
          pagination={false}
          size="small"
        />
      </Card>

      <Card bordered={false} className="shadow-sm" title="统计历史">
        <Table
          columns={[
            { dataIndex: 'scope', key: 'scope', title: '统计范围' },
            { dataIndex: 'user', key: 'user', title: '操作人' },
            { dataIndex: 'time', key: 'time', title: '时间' },
            { dataIndex: 'result', key: 'result', title: '结果' },
          ]}
          dataSource={HISTORY_LIST}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
});

BusinessStatisticsPage.displayName = 'BusinessStatisticsPage';

const BusinessStatisticsPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessStatisticsPage />
  </BusinessPageContainer>
));

BusinessStatisticsPageWithContainer.displayName = 'BusinessStatisticsPageWithContainer';

export default BusinessStatisticsPageWithContainer;
