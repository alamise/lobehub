'use client';

import { Card, Pagination, Typography, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { parseAsInteger, parseAsString, useQueryParam } from '@/hooks/useQueryParam';
import { useUrlPage } from '@/hooks/useUrlPage';
import { useSession } from '@/libs/better-auth/auth-client';

import {
  getAiArchives,
  getArchiveCategories,
  type AiArchiveItem,
  type ArchiveCategory,
} from './api';
import { ArchiveTable, SearchToolbar, type ArchiveFilterDraft } from './components';
import {
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
  PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from './constants';

import BusinessPageContainer from '@/features/BusinessPageContainer';

const URL_OPTIONS = { clearOnDefault: true, history: 'replace' as const };

/** 字符串过滤条件与 URL 双向同步（默认空值时自动移除参数） */
const useUrlString = (key: string) =>
  useQueryParam(key, parseAsString.withDefault(''), URL_OPTIONS);

const BusinessArchivePage = memo(() => {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => ((session as { accessToken?: string } | null | undefined)?.accessToken ?? null),
    [session],
  );

  // —— 已提交的过滤 / 排序 / 分页状态（全部同步 URL，对齐旧版行为）——
  const [page, setPage] = useUrlPage();
  const [size, setSize] = useQueryParam(
    'size',
    parseAsInteger.withDefault(PAGE_SIZE),
    URL_OPTIONS,
  );
  const [sortField, setSortField] = useQueryParam(
    'sortField',
    parseAsString.withDefault(DEFAULT_SORT_FIELD),
    URL_OPTIONS,
  );
  const [sortOrderRaw, setSortOrder] = useQueryParam(
    'sortOrder',
    parseAsString.withDefault(DEFAULT_SORT_ORDER),
    URL_OPTIONS,
  );
  const sortOrder: 'asc' | 'desc' = sortOrderRaw === 'desc' ? 'desc' : 'asc';

  const [title, setTitle] = useUrlString('title');
  const [docNo, setDocNo] = useUrlString('docNo');
  const [year, setYear] = useUrlString('year');
  const [categoryPrefix, setCategoryPrefix] = useUrlString('categoryPrefix');
  const [categoryCode, setCategoryCode] = useUrlString('categoryCode');

  // —— 输入框草稿状态（点击搜索后才提交）——
  const [draft, setDraft] = useState<ArchiveFilterDraft>({
    categoryCode,
    categoryPrefix,
    docNo,
    title,
    year,
  });

  const [total, setTotal] = useState(0);
  const [archives, setArchives] = useState<AiArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);

  const loadArchives = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAiArchives({
        authToken,
        category_code: categoryCode || undefined,
        category_prefix: categoryPrefix || undefined,
        doc_no: docNo || undefined,
        order: sortOrder,
        page,
        size,
        sort: sortField,
        title: title || undefined,
        year: year || undefined,
      });
      setArchives(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setArchives([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '档案列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [authToken, categoryCode, categoryPrefix, docNo, page, size, sortField, sortOrder, title, year]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getArchiveCategories(authToken);
      setCategories(data || []);
    } catch {
      setCategories([]);
    }
  }, [authToken]);

  useEffect(() => {
    if (isPending) return;
    void loadCategories();
  }, [isPending, loadCategories]);

  useEffect(() => {
    if (isPending) return;
    void loadArchives();
  }, [isPending, loadArchives]);

  const handleDraftChange = (patch: Partial<ArchiveFilterDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSearch = () => {
    setTitle(draft.title.trim());
    setDocNo(draft.docNo.trim());
    setYear(draft.year.trim());
    setCategoryPrefix(draft.categoryPrefix);
    setCategoryCode(draft.categoryCode);
    setPage(1);
  };

  const handleClear = () => {
    setDraft({ categoryCode: '', categoryPrefix: '', docNo: '', title: '', year: '' });
    setTitle('');
    setDocNo('');
    setYear('');
    setCategoryPrefix('');
    setCategoryCode('');
    setPage(1);
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    setPage(1);
  };

  const hasFilter = Boolean(title || docNo || year || categoryPrefix || categoryCode);

  const openDetail = (id: number) => {
    navigate(`/enforcement/archive/${id}`);
  };

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在加载档案页面...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <FileTextOutlined style={{ fontSize: 22 }} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            AI 档案
          </Typography.Title>
          <Typography.Text type="secondary">企业档案与非企业档案统一管理与检索</Typography.Text>
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <div className="space-y-4">
          <SearchToolbar
            categories={categories}
            draft={draft}
            hasFilter={hasFilter}
            loading={loading}
            onClear={handleClear}
            onDraftChange={handleDraftChange}
            onSearch={handleSearch}
          />

          <ArchiveTable
            archives={archives}
            loading={loading}
            onDetail={openDetail}
            onSortChange={handleSortChange}
            sortField={sortField}
            sortOrder={sortOrder}
          />

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
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              showSizeChanger
              total={total}
            />
          </div>
        </div>
      </Card>
    </div>
  );
});

BusinessArchivePage.displayName = 'BusinessArchivePage';

const BusinessArchivePageWithContainer = memo(() => (
  <BusinessPageContainer>
    <BusinessArchivePage />
  </BusinessPageContainer>
));

BusinessArchivePageWithContainer.displayName = 'BusinessArchivePageWithContainer';

export default BusinessArchivePageWithContainer;
