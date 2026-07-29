'use client';

import { Button, Card, Empty, Input, Pagination, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { BookOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { BookOpen } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

import { useUrlPage } from '@/hooks/useUrlPage';

import { useSession } from '@/libs/better-auth/auth-client';

import {
  listCategories,
  listKnowledge,
  type KnowledgeCategory,
  type KnowledgeItem,
} from './api';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const PAGE_SIZE = 10;

const BusinessKnowledgeBasePage = memo(() => {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? null;

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(PAGE_SIZE);
  const [page, setPage] = useUrlPage();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [responsible, setResponsible] = useState('');
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listKnowledge({
        authToken: token,
        category_code: categoryCode || undefined,
        page,
        responsible_party: responsible || undefined,
        search: keyword || undefined,
        size,
      });
      setItems(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token, categoryCode, keyword, page, responsible, size]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listCategories(token)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <BookOpen size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            科室业务知识库检索
          </Typography.Title>
          <Typography.Text type="secondary">科室业务文件与制度规范检索</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Space className="mb-4" wrap>
          <Input
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setKeyword(search.trim());
            }}
            placeholder="搜索标题 / 文号"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            value={search}
          />
          <Select
            allowClear
            listHeight={320}
            onChange={(v) => {
              setCategoryCode(v || '');
              setPage(1);
            }}
            options={categories.map((c) => ({ label: `${c.code} ${c.name}`, value: c.code }))}
            placeholder="文档分类"
            style={{ width: 200 }}
            value={categoryCode || undefined}
          />
          <Input
            allowClear
            onChange={(e) => setResponsible(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setResponsible(responsible.trim());
              setKeyword(search.trim());
            }}
            placeholder="责任者 / 科室"
            style={{ width: 200 }}
            value={responsible}
          />
          <Button icon={<SearchOutlined />} onClick={() => { setPage(1); setResponsible(responsible.trim()); setKeyword(search.trim()); }} type="primary">
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
            刷新
          </Button>
          <Typography.Text type="secondary">共 {total} 条</Typography.Text>
        </Space>

        <Spin spinning={loading}>
          {items.length === 0 ? (
            <Empty description="暂无知识库文档" />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id} bordered={false} className="shadow-sm" hoverable size="small">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <BookOutlined style={{ fontSize: 18 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Typography.Text strong ellipsis style={{ fontSize: 14 }}>
                        {item.title || '未命名文档'}
                      </Typography.Text>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.category_name && <Tag color="purple">{item.category_name}</Tag>}
                        {item.doc_no && <Tag>{item.doc_no}</Tag>}
                        {item.year && <Tag>{item.year}</Tag>}
                      </div>
                      {(item.responsible_party || item.dept_name) && (
                        <div className="mt-1 text-xs text-slate-400">
                          责任者：{item.responsible_party || item.dept_name}
                        </div>
                      )}
                      <Typography.Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ fontSize: 12, marginTop: 6 }}
                        type="secondary"
                      >
                        {item.ai_guide || item.responsible_party || item.dept_name || '暂无摘要'}
                      </Typography.Paragraph>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Spin>

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
    </div>
  );
});

BusinessKnowledgeBasePage.displayName = 'BusinessKnowledgeBasePage';

const BusinessKnowledgeBasePageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessKnowledgeBasePage />
  </BusinessPageContainer>
));

BusinessKnowledgeBasePageWithContainer.displayName = 'BusinessKnowledgeBasePageWithContainer';

export default BusinessKnowledgeBasePageWithContainer;
