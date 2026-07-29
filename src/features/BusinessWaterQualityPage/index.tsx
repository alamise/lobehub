'use client';

import { Button, Card, Select, Table, Tabs, Typography, message } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { memo, useMemo, useState } from 'react';

import { MiniLineChart, type LineSeries } from '@/features/BusinessCharts';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const SUMMARY_TYPES = [
  { label: '地表水常规', value: 'water-routine' },
  { label: '采测分离-国控', value: 'split-national' },
  { label: '采测分离-省控', value: 'split-provincial' },
  { label: '采测分离-饮用水', value: 'split-drinking' },
  { label: '河长制', value: 'river-chief' },
  { label: '乡镇交接考核', value: 'town-assessment' },
  { label: '湖长制', value: 'lake-chief' },
];

const SECTIONS = [
  { label: '余杭塘河-余杭段', value: 'S001' },
  { label: '小和山-上游断面', value: 'S002' },
  { label: '东苕溪-良渚段', value: 'S003' },
  { label: '西溪湿地入口', value: 'S004' },
  { label: '苕溪支流-古荡段', value: 'S005' },
  { label: '南湖-北岸断面', value: 'S006' },
  { label: '运河-余杭支渠', value: 'S007' },
  { label: '余杭水库下游', value: 'S008' },
  { label: '瓶窑-上游断面', value: 'S009' },
  { label: '崇贤-桥下断面', value: 'S010' },
  { label: '闲林水库-出口', value: 'S011' },
  { label: '未来科技城-滨水段', value: 'S012' },
  { label: '乔司港-东段', value: 'S013' },
  { label: '仁和港-马山段', value: 'S014' },
  { label: '塘栖-运河段', value: 'S015' },
  { label: '勾庄-河口断面', value: 'S016' },
  { label: '中泰-上游断面', value: 'S017' },
  { label: '良渚港-文化村段', value: 'S018' },
];

const MONITOR_ITEMS = [
  { label: '化学需氧量(COD) mg/L', value: 'COD' },
  { label: '生化需氧量(BOD₅) mg/L', value: 'BOD' },
  { label: '氨氮 mg/L', value: 'NH3N' },
  { label: '总氮(TN) mg/L', value: 'TN' },
  { label: '总磷(TP) mg/L', value: 'TP' },
  { label: '溶解氧(DO) mg/L', value: 'DO' },
  { label: 'pH', value: 'pH' },
  { label: '电导率 μS/cm', value: 'Cond' },
  { label: '浊度 NTU', value: 'Turb' },
  { label: '水温 ℃', value: 'Temp' },
  { label: '氧化还原电位 mV', value: 'ORP' },
  { label: '悬浮物(SS) mg/L', value: 'SS' },
  { label: '氯离子 mg/L', value: 'Cl' },
  { label: '铅(Pb) mg/L', value: 'Pb' },
  { label: '镉(Cd) mg/L', value: 'Cd' },
  { label: '汞(Hg) mg/L', value: 'Hg' },
  { label: '砷(As) mg/L', value: 'As' },
  { label: '铜(Cu) mg/L', value: 'Cu' },
  { label: '锌(Zn) mg/L', value: 'Zn' },
];

const MONTHS = [
  { label: '年均', value: 'avg' },
  ...Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: String(i + 1) })),
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => 2021 + i);

const METRICS = [
  { key: 'pH', name: 'pH值', color: '#10b981' },
  { key: 'DO', name: '溶解氧(mg/L)', color: '#3b82f6' },
  { key: 'CODMn', name: '高锰酸盐指数(mg/L)', color: '#f59e0b' },
  { key: 'NH3N', name: '氨氮(mg/L)', color: '#ef4444' },
  { key: 'TP', name: '总磷(mg/L)', color: '#8b5cf6' },
  { key: 'TN', name: '总氮(mg/L)', color: '#06b6d4' },
];

const TREND: Record<string, Record<string, number>[]> = {
  奉口: [
    { pH: 7.2, DO: 8.5, CODMn: 3.2, NH3N: 0.15, TP: 0.08, TN: 1.2 },
    { pH: 7.3, DO: 8.8, CODMn: 3.0, NH3N: 0.12, TP: 0.07, TN: 1.1 },
    { pH: 7.4, DO: 8.6, CODMn: 3.1, NH3N: 0.14, TP: 0.09, TN: 1.3 },
    { pH: 7.2, DO: 8.4, CODMn: 3.3, NH3N: 0.16, TP: 0.1, TN: 1.4 },
    { pH: 7.5, DO: 8.7, CODMn: 2.9, NH3N: 0.11, TP: 0.06, TN: 1.0 },
    { pH: 7.3, DO: 8.5, CODMn: 3.0, NH3N: 0.13, TP: 0.08, TN: 1.2 },
    { pH: 7.4, DO: 8.6, CODMn: 3.2, NH3N: 0.15, TP: 0.09, TN: 1.3 },
    { pH: 7.2, DO: 8.3, CODMn: 3.4, NH3N: 0.17, TP: 0.11, TN: 1.5 },
    { pH: 7.3, DO: 8.5, CODMn: 3.1, NH3N: 0.14, TP: 0.08, TN: 1.2 },
    { pH: 7.4, DO: 8.7, CODMn: 2.9, NH3N: 0.12, TP: 0.07, TN: 1.1 },
    { pH: 7.3, DO: 8.6, CODMn: 3.0, NH3N: 0.13, TP: 0.08, TN: 1.2 },
    { pH: 7.2, DO: 8.4, CODMn: 3.2, NH3N: 0.15, TP: 0.09, TN: 1.3 },
    { pH: 7.3, DO: 8.6, CODMn: 3.1, NH3N: 0.14, TP: 0.08, TN: 1.2 },
  ],
  塘栖大桥: [
    { pH: 7.1, DO: 8.2, CODMn: 3.5, NH3N: 0.18, TP: 0.1, TN: 1.4 },
    { pH: 7.2, DO: 8.4, CODMn: 3.3, NH3N: 0.16, TP: 0.09, TN: 1.3 },
    { pH: 7.3, DO: 8.3, CODMn: 3.4, NH3N: 0.17, TP: 0.1, TN: 1.4 },
    { pH: 7.1, DO: 8.1, CODMn: 3.6, NH3N: 0.19, TP: 0.11, TN: 1.5 },
    { pH: 7.4, DO: 8.5, CODMn: 3.2, NH3N: 0.15, TP: 0.08, TN: 1.2 },
    { pH: 7.2, DO: 8.3, CODMn: 3.3, NH3N: 0.16, TP: 0.09, TN: 1.3 },
    { pH: 7.3, DO: 8.4, CODMn: 3.4, NH3N: 0.17, TP: 0.1, TN: 1.4 },
    { pH: 7.1, DO: 8.0, CODMn: 3.7, NH3N: 0.2, TP: 0.12, TN: 1.6 },
    { pH: 7.2, DO: 8.2, CODMn: 3.4, NH3N: 0.17, TP: 0.1, TN: 1.4 },
    { pH: 7.3, DO: 8.4, CODMn: 3.2, NH3N: 0.15, TP: 0.09, TN: 1.3 },
    { pH: 7.2, DO: 8.3, CODMn: 3.3, NH3N: 0.16, TP: 0.09, TN: 1.3 },
    { pH: 7.1, DO: 8.1, CODMn: 3.5, NH3N: 0.18, TP: 0.1, TN: 1.4 },
    { pH: 7.2, DO: 8.3, CODMn: 3.4, NH3N: 0.17, TP: 0.1, TN: 1.4 },
  ],
  义桥: [
    { pH: 7.0, DO: 7.9, CODMn: 3.8, NH3N: 0.21, TP: 0.12, TN: 1.6 },
    { pH: 7.1, DO: 8.1, CODMn: 3.6, NH3N: 0.19, TP: 0.11, TN: 1.5 },
    { pH: 7.2, DO: 8.0, CODMn: 3.7, NH3N: 0.2, TP: 0.12, TN: 1.6 },
    { pH: 7.0, DO: 7.8, CODMn: 3.9, NH3N: 0.22, TP: 0.13, TN: 1.7 },
    { pH: 7.3, DO: 8.2, CODMn: 3.5, NH3N: 0.18, TP: 0.1, TN: 1.4 },
    { pH: 7.1, DO: 8.0, CODMn: 3.6, NH3N: 0.19, TP: 0.11, TN: 1.5 },
    { pH: 7.2, DO: 8.1, CODMn: 3.7, NH3N: 0.2, TP: 0.12, TN: 1.6 },
    { pH: 7.0, DO: 7.7, CODMn: 4.0, NH3N: 0.23, TP: 0.14, TN: 1.8 },
    { pH: 7.1, DO: 7.9, CODMn: 3.7, NH3N: 0.2, TP: 0.12, TN: 1.6 },
    { pH: 7.2, DO: 8.1, CODMn: 3.5, NH3N: 0.18, TP: 0.11, TN: 1.5 },
    { pH: 7.1, DO: 8.0, CODMn: 3.6, NH3N: 0.19, TP: 0.11, TN: 1.5 },
    { pH: 7.0, DO: 7.8, CODMn: 3.8, NH3N: 0.21, TP: 0.12, TN: 1.6 },
    { pH: 7.1, DO: 8.0, CODMn: 3.7, NH3N: 0.2, TP: 0.12, TN: 1.6 },
  ],
};

const TREND_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月', '年均',
];

// 稳定的伪随机，保证同一断面/指标每次渲染结果一致
const pseudo = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return h / 100000;
};

const BusinessWaterQualityPage = memo(() => {
  const [summaryType, setSummaryType] = useState(SUMMARY_TYPES[0].value);
  const [sections, setSections] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>(['COD', 'NH3N', 'TP', 'DO', 'TN', 'pH']);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [months, setMonths] = useState<string[]>(['avg']);
  const [searched, setSearched] = useState(false);
  const [activeTrend, setActiveTrend] = useState('奉口');

  const canSearch = sections.length > 0 && items.length > 0 && months.length > 0;

  const handleSearch = () => {
    if (!canSearch) {
      message.warning('请至少选择断面、监测项目与月份');
      return;
    }
    setSearched(true);
  };

  const handleReset = () => {
    setSearched(false);
    setSections([]);
    setItems(['COD', 'NH3N', 'TP', 'DO', 'TN', 'pH']);
    setMonths(['avg']);
    setYear(CURRENT_YEAR);
  };

  const trendSeries: LineSeries[] = useMemo(
    () =>
      METRICS.map((m) => ({
        color: m.color,
        data: TREND[activeTrend]?.map((row) => row[m.key]) ?? [],
        name: m.name,
      })),
    [activeTrend],
  );

  const itemLabel = (v: string) => MONITOR_ITEMS.find((it) => it.value === v)?.label ?? v;

  const tableColumns = [
    { dataIndex: 'section', key: 'section', title: '断面' },
    ...items.map((it) => ({ dataIndex: it, key: it, title: itemLabel(it) })),
  ];

  const tableData = useMemo(() => {
    if (!searched) return [];
    return sections.map((sid) => {
      const row: Record<string, string> = {
        key: sid,
        section: SECTIONS.find((s) => s.value === sid)?.label ?? sid,
      };
      items.forEach((it) => {
        const base = it === 'pH' ? 7.2 : it === 'DO' ? 8.4 : it === 'TP' ? 0.09 : it === 'TN' ? 1.3 : it === 'CODMn' ? 3.2 : 0.15;
        const val = base * (0.85 + pseudo(`${sid}-${it}`) * 0.3);
        row[it] = it === 'pH' ? val.toFixed(2) : val.toFixed(3);
      });
      return row;
    });
  }, [searched, sections, items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
          <ExperimentOutlined style={{ fontSize: 22 }} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            水环境质量分析
          </Typography.Title>
          <Typography.Text type="secondary">地表水断面监测数据智能汇总与趋势分析</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="mb-1 text-sm text-slate-600">汇总类型</div>
            <Select
              className="w-full"
              options={SUMMARY_TYPES}
              value={summaryType}
              onChange={setSummaryType}
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-1 text-sm text-slate-600">监测断面（可多选）</div>
            <Select
              className="w-full"
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              options={SECTIONS}
              placeholder="请选择断面"
              value={sections}
              onChange={setSections}
            />
          </div>
          <div className="md:col-span-5">
            <div className="mb-1 text-sm text-slate-600">监测项目（可多选）</div>
            <Select
              className="w-full"
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              options={MONITOR_ITEMS}
              placeholder="请选择监测项目"
              value={items}
              onChange={setItems}
            />
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-sm text-slate-600">年份</div>
            <Select
              className="w-full"
              options={YEARS.map((y) => ({ label: `${y}年`, value: y }))}
              value={year}
              onChange={setYear}
            />
          </div>
          <div className="md:col-span-5">
            <div className="mb-1 text-sm text-slate-600">月份（可多选）</div>
            <Select
              className="w-full"
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              options={MONTHS}
              placeholder="请选择月份"
              value={months}
              onChange={setMonths}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="primary" onClick={handleSearch}>
              智能汇总
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </div>
      </Card>

      {searched ? (
        <Card bordered={false} className="shadow-sm" title="国控省控重要断面趋势图">
          <Tabs
            activeKey={activeTrend}
            items={Object.keys(TREND).map((name) => ({ key: name, label: name }))}
            onChange={setActiveTrend}
          />
          <MiniLineChart labels={TREND_LABELS} series={trendSeries} />
        </Card>
      ) : (
        <Card bordered={false} className="shadow-sm">
          <div className="py-16 text-center text-sm text-slate-400">
            请在上方选择监测断面、监测项目与月份后点击「智能汇总」
          </div>
        </Card>
      )}

      {searched && (
        <Card bordered={false} className="shadow-sm" title="断面数据列表">
          <Table
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}
    </div>
  );
});

BusinessWaterQualityPage.displayName = 'BusinessWaterQualityPage';

const BusinessWaterQualityPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessWaterQualityPage />
  </BusinessPageContainer>
));

BusinessWaterQualityPageWithContainer.displayName = 'BusinessWaterQualityPageWithContainer';

export default BusinessWaterQualityPageWithContainer;
