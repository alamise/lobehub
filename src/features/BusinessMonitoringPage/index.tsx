'use client';

import { Button, Card, Checkbox, Input, Space, Tabs, Typography, message } from 'antd';
import { Activity } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

import BusinessPageContainer from '@/features/BusinessPageContainer';

// 静态 mock 工具页：复刻 legacy Monitoring 的「监测方案生成器」。
// 所有数据均为前端硬编码，无后端调用。

const CATEGORIES = ['地表水', '地下水', '大气', '土壤', '噪声', '固体废物'];

const MONITORING_ITEMS = [
  'pH', '溶解氧', '高锰酸盐指数', '化学需氧量', '氨氮', '总磷', '总氮',
  '铜', '锌', '氟化物', '砷', '汞', '镉', '铬（六价）', '铅', '氰化物',
  '挥发酚', '石油类', '阴离子表面活性剂', '硫化物',
];

const METHODS = [
  '纳氏试剂分光光度法', '钼酸铵分光光度法', '重铬酸盐法', '火焰原子吸收分光光度法',
  '石墨炉原子吸收法', '冷原子吸收法', '气相色谱法', '液相色谱法',
];

const INSTRUMENTS = ['原子吸收分光光度计', '紫外可见分光光度计', '气相色谱仪', '液相色谱仪', 'pH 计', '声级计'];

const CHAT_QA: { q: string; a: string }[] = [
  { q: '地表水常规监测频次如何确定？', a: '一般依据水体功能类别与纳污情况，按要求开展月度或季度监测，重点断面可加密至每周。' },
  { q: '总磷的推荐分析方法？', a: '推荐钼酸铵分光光度法（GB 11893），检出限低、操作简便。' },
  { q: '噪声监测布点原则？', a: '应覆盖厂界四周及敏感点，昼间夜间分别监测，避开恶劣天气，传声器距地面 1.2m。' },
];

const BusinessMonitoringPage = memo(() => {
  const [cats, setCats] = useState<string[]>(['地表水']);
  const [items, setItems] = useState<string[]>(['pH', '溶解氧', '氨氮']);
  const [methods, setMethods] = useState<string[]>(['纳氏试剂分光光度法']);
  const [instruments, setInstruments] = useState<string[]>(['紫外可见分光光度计']);

  const template = useMemo(() => {
    const lines = [
      '【监测方案模板】',
      `监测类别：${cats.join('、') || '（未选）'}`,
      `监测项目：${items.join('、') || '（未选）'}`,
      `分析方法：${methods.join('、') || '（未选）'}`,
      `仪器设备：${instruments.join('、') || '（未选）'}`,
      '',
      '一、监测点位：依据相关技术规范布设代表性点位。',
      '二、监测频次：按类别与管控要求确定。',
      '三、质量保证：全程空白、平行样与加标回收率控制。',
    ];
    return lines.join('\n');
  }, [cats, items, methods, instruments]);

  const report = useMemo(() => {
    const lines = [
      '【监测报告（示例）】',
      `本次对 ${cats.join('、') || '—'} 开展监测，共 ${items.length} 个监测项目。`,
      '监测结果表明，各指标均符合相应标准限值要求，详见附表明细。',
      '结论：受测对象环境质量状况总体良好，建议持续开展跟踪监测。',
    ];
    return lines.join('\n');
  }, [cats, items]);

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ): void => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => message.success('已复制到剪贴板'),
      () => message.warning('复制失败'),
    );
  };

  const tabItems = [
    {
      children: (
        <Space direction="vertical" className="w-full" size="large">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">监测类别</div>
            <Space wrap>
              {CATEGORIES.map((c) => (
                <Checkbox
                  checked={cats.includes(c)}
                  key={c}
                  onChange={() => toggle(cats, setCats, c)}
                >
                  {c}
                </Checkbox>
              ))}
            </Space>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">监测项目</div>
            <Space wrap>
              {MONITORING_ITEMS.map((it) => (
                <Checkbox
                  checked={items.includes(it)}
                  key={it}
                  onChange={() => toggle(items, setItems, it)}
                >
                  {it}
                </Checkbox>
              ))}
            </Space>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">分析方法</div>
            <Space wrap>
              {METHODS.map((m) => (
                <Checkbox
                  checked={methods.includes(m)}
                  key={m}
                  onChange={() => toggle(methods, setMethods, m)}
                >
                  {m}
                </Checkbox>
              ))}
            </Space>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">仪器设备</div>
            <Space wrap>
              {INSTRUMENTS.map((ins) => (
                <Checkbox
                  checked={instruments.includes(ins)}
                  key={ins}
                  onChange={() => toggle(instruments, setInstruments, ins)}
                >
                  {ins}
                </Checkbox>
              ))}
            </Space>
          </div>
          <Card size="small" title="方案模板预览">
            <pre className="whitespace-pre-wrap text-xs text-slate-600">{template}</pre>
            <Button className="mt-2" onClick={() => copy(template)} size="small" type="primary">
              复制模板
            </Button>
          </Card>
        </Space>
      ),
      key: 'template',
      label: '方案模板',
    },
    {
      children: (
        <Card size="small" title="生成报告预览">
          <pre className="whitespace-pre-wrap text-xs text-slate-600">{report}</pre>
          <Button className="mt-2" onClick={() => copy(report)} size="small" type="primary">
            复制报告
          </Button>
        </Card>
      ),
      key: 'report',
      label: '生成报告',
    },
    {
      children: (
        <Space direction="vertical" className="w-full">
          {CHAT_QA.map((qa, i) => (
            <Card key={i} size="small">
              <div className="text-sm font-medium text-slate-700">Q：{qa.q}</div>
              <div className="mt-1 text-sm text-slate-600">A：{qa.a}</div>
            </Card>
          ))}
          <Typography.Text type="secondary">示例问答为前端内置，非实时模型调用。</Typography.Text>
        </Space>
      ),
      key: 'chat',
      label: '示例问答',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <Activity size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            AI 辅助监测
          </Typography.Title>
          <Typography.Text type="secondary">监测方案智能生成与指标管理</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
});

BusinessMonitoringPage.displayName = 'BusinessMonitoringPage';

const BusinessMonitoringPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessMonitoringPage />
  </BusinessPageContainer>
));

BusinessMonitoringPageWithContainer.displayName = 'BusinessMonitoringPageWithContainer';

export default BusinessMonitoringPageWithContainer;
