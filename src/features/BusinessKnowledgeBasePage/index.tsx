'use client';

import { Button, Select } from '@lobehub/ui/base-ui';
import { Empty, message, Pagination, Spin, Typography } from 'antd';
import { createStaticStyles } from 'antd-style';
import { BookOpen, Download, Eye, Search } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useUrlPage } from '@/hooks/useUrlPage';
import { useSession } from '@/libs/better-auth/auth-client';

import { type KnowledgeCategory, type KnowledgeItem, listCategories, listKnowledge } from './api';

const PAGE_SIZE = 10;

const styles = createStaticStyles(({ css }) => ({
  actionStack: css`
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 8px;

    margin-inline-start: 16px;

    @media (width <= 720px) {
      flex-direction: row;
      margin-block-start: 12px;
      margin-inline-start: 0;
    }
  `,
  filterCard: css`
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 5%);
  `,
  filterRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  `,
  iconBox: css`
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;

    width: 44px;
    height: 44px;
    border-radius: 12px;

    color: #059669;

    background: #ecfdf5;
  `,
  item: css`
    padding: 16px;
    transition: background 0.16s ease;

    &:hover {
      background: #f8fafc;
    }
  `,
  itemBody: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    @media (width <= 720px) {
      flex-direction: column;
    }
  `,
  itemMeta: css`
    display: flex;
    gap: 16px;
    align-items: center;

    margin-block-start: 12px;

    font-size: 12px;
    color: #64748b;
  `,
  resultCard: css`
    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 5%);
  `,
  resultHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding-block: 12px;
    padding-inline: 16px;
    border-block-end: 1px solid #e2e8f0;
  `,
  resultList: css`
    > div + div {
      border-block-start: 1px solid #e2e8f0;
    }
  `,
  searchInput: css`
    flex: 1;

    min-width: 280px;
    height: 46px;
    padding-block: 0;
    padding-inline: 16px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;

    font-size: 14px;
    color: #334155;

    outline: none;

    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease;

    &::placeholder {
      color: #94a3b8;
    }

    &:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgb(16 185 129 / 16%);
    }
  `,
  summary: css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;

    margin-block: 0 12px;

    font-size: 14px;
    line-height: 1.7;
    color: #475569;
  `,
  tag: css`
    display: inline-flex;
    align-items: center;

    padding-block: 4px;
    padding-inline: 8px;
    border-radius: 999px;

    font-size: 12px;
    font-weight: 600;
  `,
  titleRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;

    margin-block-end: 8px;
  `,
}));

const getCategoryLevel = (code: string) => Math.max(0, Math.floor(code.trim().length / 2) - 1);

const formatCategoryLabel = (category: KnowledgeCategory) => {
  const level = getCategoryLevel(category.code);
  const prefix = level > 0 ? `${'- '.repeat(level)}` : '';

  return `${prefix}${category.code} ${category.name}`;
};

const getCategoryClassName = (categoryName?: string) => {
  const categoryMap: Record<string, string> = {
    信用修复: 'background:#f3e8ff;color:#6b21a8',
    固体废物与化学品管理: 'background:#fef9c3;color:#854d0e',
    应急预案: 'background:#fee2e2;color:#991b1b',
    执法规范: 'background:#dcfce7;color:#166534',
    标准规范: 'background:#dbeafe;color:#1e40af',
    生态损害赔偿: 'background:#ffedd5;color:#9a3412',
  };

  return categoryMap[categoryName || ''] || 'background:#f1f5f9;color:#334155';
};

const getArchiveSummary = (archive: KnowledgeItem) => {
  const aiGuideSummary = archive.ai_guide
    ?.replaceAll(/[#>*`-]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

  if (aiGuideSummary)
    return aiGuideSummary.length > 120 ? `${aiGuideSummary.slice(0, 120)}...` : aiGuideSummary;

  return archive.doc_no || archive.title || '暂无摘要';
};

const BusinessKnowledgeBasePage = memo(() => {
  const navigate = useWorkspaceAwareNavigate();
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
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listKnowledge({
        authToken: token,
        category_code: categoryCode || undefined,
        order: 'desc',
        page,
        search: keyword || undefined,
        size,
        sort: 'id',
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
  }, [token, categoryCode, keyword, page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listCategories(token)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [token]);

  const categoryOptions = useMemo(
    () => categories.toSorted((a, b) => a.code.localeCompare(b.code)),
    [categories],
  );

  const searchArchives = () => {
    setPage(1);
    setKeyword(search.trim());
  };

  const openArchive = (archiveId: number) => {
    navigate(`/enforcement/archive/${archiveId}?source=knowledge`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={styles.iconBox}>
          <BookOpen size={22} />
        </div>
        <div>
          <Typography.Title className="!mb-0" level={3}>
            科室业务知识库检索
          </Typography.Title>
          <Typography.Text type="secondary">科室业务文件与制度规范检索</Typography.Text>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <Select
            allowClear
            listHeight={320}
            placeholder="选择文档类型"
            style={{ minWidth: 260 }}
            value={categoryCode}
            options={[
              { label: '全部文档类型', value: '' },
              ...categoryOptions.map((category) => ({
                label: formatCategoryLabel(category),
                value: category.code,
              })),
            ]}
            onChange={(value) => {
              setCategoryCode(value || '');
              setPage(1);
            }}
          />
          <input
            className={styles.searchInput}
            placeholder="请输入关键词检索各类文档"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchArchives()}
          />
          <Button icon={<Search size={16} />} type="primary" onClick={searchArchives}>
            智能搜索
          </Button>
        </div>
      </div>

      <div className={styles.resultCard}>
        <div className={styles.resultHeader}>
          <Typography.Text strong>
            搜索结果
            <Typography.Text style={{ marginLeft: 8 }} type="secondary">
              (共 {total} 项)
            </Typography.Text>
          </Typography.Text>
          <Typography.Text type="secondary">默认按最新内容展示</Typography.Text>
        </div>

        <Spin spinning={loading}>
          <div className={styles.resultList}>
            {items.map((item) => (
              <div className={styles.item} key={item.id}>
                <div className={styles.itemBody}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.titleRow}>
                      <Typography.Text strong style={{ color: '#1e293b', fontSize: 16 }}>
                        {item.title || '-'}
                      </Typography.Text>
                      <span
                        className={styles.tag}
                        style={Object.fromEntries(
                          getCategoryClassName(item.category_name)
                            .split(';')
                            .filter(Boolean)
                            .map((rule) => rule.split(':')),
                        )}
                      >
                        {item.category_name || item.category_code || '未分类'}
                      </span>
                    </div>
                    <p className={styles.summary}>{getArchiveSummary(item)}</p>
                    <div className={styles.itemMeta}>
                      <span>{item.responsible_party || item.dept_name || '-'}</span>
                      <span>{item.year || '-'}</span>
                    </div>
                  </div>

                  <div className={styles.actionStack}>
                    <Button icon={<Eye size={14} />} onClick={() => openArchive(item.id)}>
                      查看详情
                    </Button>
                    <Button icon={<Download size={14} />} onClick={() => openArchive(item.id)}>
                      打开文档
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && items.length === 0 && (
              <div style={{ padding: 32 }}>
                <Empty description="暂无匹配结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </div>
        </Spin>

        <div className="flex justify-end px-4 py-3">
          <Pagination
            showSizeChanger
            current={page}
            disabled={loading}
            pageSize={size}
            pageSizeOptions={[10, 20, 50, 100]}
            total={total}
            onChange={(nextPage, nextSize) => {
              if (nextSize !== size) {
                setSize(nextSize);
                setPage(1);
                return;
              }
              setPage(nextPage);
            }}
          />
        </div>
      </div>
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
