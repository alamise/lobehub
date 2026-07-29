'use client';

import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { FileText } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

import { useUrlPage } from '@/hooks/useUrlPage';

import { useSession } from '@/libs/better-auth/auth-client';

import {
  clearEia,
  createEia,
  deleteEia,
  getEia,
  listEia,
  updateEia,
  type EiaRecord,
  type EiaStepState,
} from './api';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const PAGE_SIZE = 20;
const STEP_LABELS: Record<string, string> = {
  summary: '摘要',
  industry: '行业归类',
  type: '环评类型',
  admission: '准入判定',
  conclusion: '结论',
};
const STEP_ORDER = ['summary', 'industry', 'type', 'admission', 'conclusion'];

const emptySteps = (): Record<string, EiaStepState> => ({
  summary: { content: '' },
  industry: { content: '' },
  type: { content: '' },
  admission: { content: '' },
  conclusion: { content: '' },
});

const BusinessEiaPage = memo(() => {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? null;

  const [items, setItems] = useState<EiaRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(PAGE_SIZE);
  const [page, setPage] = useUrlPage();
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchKw, setSearchKw] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [summaryInput, setSummaryInput] = useState('');
  const [creating, setCreating] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<EiaRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSteps, setEditSteps] = useState<Record<string, EiaStepState>>(emptySteps());
  const [editStep, setEditStep] = useState('summary');
  const [editCompleted, setEditCompleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listEia({ authToken: token, keyword: searchKw || undefined, page, size });
      setItems(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token, searchKw, page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setSummaryInput('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!summaryInput.trim()) {
      message.warning('请填写环评摘要');
      return;
    }
    setCreating(true);
    try {
      const rec = await createEia(summaryInput.trim(), token);
      message.success('已创建环评记录');
      setCreateOpen(false);
      setPage(1);
      setSearchKw('');
      await load();
      openDetail(rec.id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const rec = await getEia(id, token);
      setCurrent(rec);
      setEditSteps({ ...emptySteps(), ...rec.steps });
      setEditStep(rec.currentStep || 'summary');
      setEditCompleted(rec.completed);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载详情失败');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!current) return;
    const summary = editSteps.summary?.content || '';
    if (!summary.trim()) {
      message.warning('摘要不能为空');
      return;
    }
    setSaving(true);
    try {
      await updateEia(
        current.id,
        { currentStep: editStep, completed: editCompleted, steps: editSteps },
        token,
      );
      message.success('已保存');
      await load();
      const refreshed = await getEia(current.id, token);
      setCurrent(refreshed);
      setEditSteps({ ...emptySteps(), ...refreshed.steps });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEia(id, token);
      message.success('已删除');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleClear = async () => {
    try {
      await clearEia(token);
      message.success('已清空全部记录');
      setPage(1);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '清空失败');
    }
  };

  const columns: ColumnsType<EiaRecord> = [
    {
      dataIndex: 'id',
      title: 'ID',
      width: 80,
      render: (v: number) => v,
    },
    {
      dataIndex: 'summary',
      title: '环评摘要',
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      dataIndex: 'currentStep',
      title: '当前步骤',
      width: 120,
      render: (v: string) => STEP_LABELS[v] || v || '—',
    },
    {
      dataIndex: 'completed',
      title: '状态',
      width: 100,
      render: (v: boolean) =>
        v ? <Badge status="success" text="已完成" /> : <Badge status="processing" text="进行中" />,
    },
    {
      dataIndex: 'updatedAt',
      title: '更新时间',
      width: 180,
      render: (v: string) => v || '—',
    },
    {
      title: '操作',
      width: 150,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="link" onClick={() => openDetail(row.id)}>
            查看/编辑
          </Button>
          <Popconfirm
            cancelText="取消"
            okButtonProps={{ danger: true }}
            okText="删除"
            onConfirm={() => handleDelete(row.id)}
            title="确认删除该记录？"
          >
            <Button danger icon={<DeleteOutlined />} size="small" type="link" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <FileText size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            AI 环评
          </Typography.Title>
          <Typography.Text type="secondary">环评报告辅助编写与分步生成</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Space className="mb-4" wrap>
          <Input
            allowClear
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setSearchKw(keyword.trim());
            }}
            placeholder="搜索环评摘要"
            prefix={<FileTextOutlined />}
            style={{ width: 280 }}
            value={keyword}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
            刷新
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={openCreate}>
            新建环评
          </Button>
          <Popconfirm
            cancelText="取消"
            okButtonProps={{ danger: true }}
            okText="清空"
            onConfirm={handleClear}
            title="确认清空当前用户全部环评记录？"
          >
            <Button danger>清空全部</Button>
          </Popconfirm>
        </Space>

        <Table<EiaRecord>
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: 900 }}
          size="middle"
        />

        <div className="mt-4 flex justify-end">
          <Pagination
            current={page}
            disabled={loading}
            onChange={(nextPage, nextSize) => {
              if (nextSize !== size) {
                setSize(nextSize);
                setPage(1);
              } else {
                setPage(nextPage);
              }
            }}
            pageSize={size}
            pageSizeOptions={[10, 20, 50, 100]}
            showSizeChanger
            total={total}
          />
        </div>
      </Card>

      <Modal
        destroyOnClose
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        open={createOpen}
        title="新建环评记录"
        width={560}
      >
        <div className="mt-3">
          <Typography.Text type="secondary">填写环评项目摘要，系统将以此初始化分步工作流。</Typography.Text>
          <Input.TextArea
            className="mt-2"
            onChange={(e) => setSummaryInput(e.target.value)}
            placeholder="例如：关于 XX 公司年产 10 万吨项目环境影响评价的摘要……"
            rows={5}
            value={summaryInput}
          />
        </div>
      </Modal>

      <Drawer
        destroyOnClose
        onClose={() => setDetailOpen(false)}
        open={detailOpen}
        title={current ? `环评记录 #${current.id}` : '环评详情'}
        width={680}
      >
        {detailLoading ? (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        ) : current ? (
          <div className="space-y-4">
            <Space wrap>
              <span className="text-sm text-slate-500">当前步骤：</span>
              <Select
                onChange={setEditStep}
                options={STEP_ORDER.map((s) => ({ label: STEP_LABELS[s], value: s }))}
                style={{ width: 140 }}
                value={editStep}
              />
              <span className="text-sm text-slate-500">完成状态：</span>
              <Select
                onChange={(v) => setEditCompleted(v === 'completed')}
                options={[
                  { label: '进行中', value: 'running' },
                  { label: '已完成', value: 'completed' },
                ]}
                style={{ width: 120 }}
                value={editCompleted ? 'completed' : 'running'}
              />
            </Space>

            {STEP_ORDER.map((key) => (
              <div key={key}>
                <div className="mb-1 text-sm font-medium text-slate-700">
                  {STEP_LABELS[key]}
                  {key === 'summary' && <Tag className="ml-2">必填</Tag>}
                </div>
                <Input.TextArea
                  onChange={(e) =>
                    setEditSteps((prev) => ({
                      ...prev,
                      [key]: { ...(prev[key] || {}), content: e.target.value },
                    }))
                  }
                  placeholder={`填写${STEP_LABELS[key]}内容`}
                  rows={key === 'summary' ? 4 : 3}
                  value={editSteps[key]?.content || ''}
                />
              </div>
            ))}

            <Space>
              <Button onClick={handleSave} loading={saving} type="primary">
                保存
              </Button>
              <Button
                disabled
                title="AI 分步分析需接入大模型服务，敬请期待"
                type="default"
              >
                AI 智能分析
              </Button>
            </Space>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
});

BusinessEiaPage.displayName = 'BusinessEiaPage';

const BusinessEiaPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessEiaPage />
  </BusinessPageContainer>
));

BusinessEiaPageWithContainer.displayName = 'BusinessEiaPageWithContainer';

export default BusinessEiaPageWithContainer;
