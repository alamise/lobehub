'use client';

import { Card, Pagination, Typography, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { useUrlPage } from '@/hooks/useUrlPage';

import { useSession } from '@/libs/better-auth/auth-client';

import { getArticleById, getArticles, type ArticleItem } from './api';
import { ArticleDetailDrawer, ArticleList, SearchToolbar } from './components';
import { PAGE_SIZE } from './constants';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const BusinessMinisterInterpretationPage = memo(() => {
  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => ((session as { accessToken?: string } | null | undefined)?.accessToken ?? null),
    [session],
  );

  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [size, setSize] = useState(PAGE_SIZE);
  const [page, setPage] = useUrlPage();
  const [total, setTotal] = useState(0);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailArticle, setDetailArticle] = useState<ArticleItem | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getArticles({
        authToken,
        page,
        search: keyword || undefined,
        size,
      });
      setArticles(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setArticles([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '文章列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [authToken, keyword, page, size]);

  useEffect(() => {
    if (isPending) return;
    void loadArticles();
  }, [isPending, loadArticles]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(search.trim());
  };

  const handleReset = () => {
    setSearch('');
    setKeyword('');
    setPage(1);
  };

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await getArticleById(id, authToken);
      setDetailArticle(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文章详情加载失败');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在加载部委解读页面...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <FileTextOutlined style={{ fontSize: 22 }} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            部委解读
          </Typography.Title>
          <Typography.Text type="secondary">生态环境部等部委政策文件与解读检索</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <div className="space-y-4">
          <SearchToolbar
            loading={loading}
            search={search}
            setSearch={setSearch}
            onRefresh={handleReset}
            onSearch={handleSearch}
          />

          <ArticleList articles={articles} loading={loading} onDetail={openDetail} />

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Typography.Text type="secondary">共 {total} 条记录</Typography.Text>
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
        </div>
      </Card>

      <ArticleDetailDrawer
        article={detailArticle}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        open={detailOpen}
      />
    </div>
  );
});

BusinessMinisterInterpretationPage.displayName = 'BusinessMinisterInterpretationPage';

const BusinessMinisterInterpretationPageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessMinisterInterpretationPage />
  </BusinessPageContainer>
));

BusinessMinisterInterpretationPageWithContainer.displayName = 'BusinessMinisterInterpretationPageWithContainer';

export default BusinessMinisterInterpretationPageWithContainer;
