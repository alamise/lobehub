'use client';

import { Button, Card, Empty, Input, Space, Tag, Typography, message } from 'antd';
import { MapPin } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

import BusinessPageContainer from '@/features/BusinessPageContainer';

// 静态 mock 页面：复刻 legacy AIMap 的「六类规划地图 + 本地关键词匹配 AI 对话」。
// 真实 WMTS 瓦片代理在 legacy 中未被该页使用，这里按既有 UI 形态保留占位与假对话。

const MAP_CATEGORIES = [
  { key: 'three-lines', name: '三线一单', desc: '生态保护红线、环境质量底线、资源利用上线与生态环境准入清单' },
  { key: 'eco-redline', name: '生态保护红线', desc: '生态保护红线区域分布' },
  { key: 'land-space', name: '国土空间规划', desc: '国土空间开发利用规划' },
  { key: 'drinking', name: '饮用水保护区', desc: '集中式饮用水水源保护区' },
  { key: 'industrial', name: '工业区规划', desc: '工业园区与产业集聚区规划' },
  { key: 'acoustic', name: '声环境功能区划', desc: '声环境功能区划分' },
];

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
}

const KEYWORD_MAP: Record<string, string> = {
  红线: 'three-lines',
  生态: 'eco-redline',
  国土: 'land-space',
  用地: 'land-space',
  饮用: 'drinking',
  水源: 'drinking',
  工业: 'industrial',
  园区: 'industrial',
  声: 'acoustic',
  噪声: 'acoustic',
};

// 本地关键词匹配的「假 AI」：返回命中的地图分类与示例点位
const computeAssessment = (q: string): string => {
  const hits = new Set<string>();
  Object.keys(KEYWORD_MAP).forEach((kw) => {
    if (q.includes(kw)) hits.add(KEYWORD_MAP[kw]);
  });
  const matched = MAP_CATEGORIES.filter((c) => hits.has(c.key));
  if (matched.length === 0) {
    return '未能从您的描述中识别到明确的规划地图类别。可尝试包含关键词：红线、生态、国土、饮用水、工业、声环境等。';
  }
  const lines = matched.map(
    (c) => `• ${c.name}：${c.desc}（示例点位 A，经纬度 120.123, 30.281）`,
  );
  return `根据描述，命中以下规划地图类别：\n${lines.join('\n')}`;
};

const BusinessAIMapPage = memo(() => {
  const [active, setActive] = useState<string>('three-lines');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: '您好，我是 AI 地图助手。描述您的项目位置或关注要素，我为您匹配相关规划地图。' },
  ]);

  const activeCat = useMemo(() => MAP_CATEGORIES.find((c) => c.key === active), [active]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    const reply = computeAssessment(q);
    setMessages((prev) => [...prev, { role: 'user', text: q }, { role: 'ai', text: reply }]);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <MapPin size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            AI 地图
          </Typography.Title>
          <Typography.Text type="secondary">规划地图辅助研判与 AI 对话</Typography.Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card bordered={false} className="shadow-sm" title="规划地图分类">
          <Space wrap>
            {MAP_CATEGORIES.map((c) => (
              <Button
                key={c.key}
                onClick={() => setActive(c.key)}
                type={active === c.key ? 'primary' : 'default'}
              >
                {c.name}
              </Button>
            ))}
          </Space>
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            {activeCat?.key === 'three-lines' ? (
              <div>
                <div className="text-base font-medium text-slate-500">三线一单分布图</div>
                <div className="mt-2">（地图占位：请在后端接入 WMTS 瓦片代理后展示）</div>
              </div>
            ) : (
              <div>
                <div className="text-base font-medium text-slate-500">{activeCat?.name} 地图占位</div>
                <div className="mt-2">{activeCat?.desc}</div>
                <Tag className="mt-2">地图占位（{activeCat?.name}）</Tag>
              </div>
            )}
          </div>
        </Card>

        <Card bordered={false} className="shadow-sm" title="AI 对话">
          <div className="flex h-[360px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <Empty description="暂无对话" />
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={m.role === 'user' ? 'text-right' : 'text-left'}
                  >
                    <div
                      className={
                        m.role === 'user'
                          ? 'inline-block rounded-lg bg-sky-500 px-3 py-2 text-left text-sm text-white'
                          : 'inline-block rounded-lg bg-slate-100 px-3 py-2 text-left text-sm text-slate-700'
                      }
                    >
                      <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Space.Compact className="mt-3 w-full">
              <Input
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={send}
                placeholder="描述项目位置或关注要素…"
                value={input}
              />
              <Button onClick={send} type="primary">
                发送
              </Button>
            </Space.Compact>
          </div>
        </Card>
      </div>
    </div>
  );
});

BusinessAIMapPage.displayName = 'BusinessAIMapPage';

const BusinessAIMapPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessAIMapPage />
  </BusinessPageContainer>
));

BusinessAIMapPageWithContainer.displayName = 'BusinessAIMapPageWithContainer';

export default BusinessAIMapPageWithContainer;
