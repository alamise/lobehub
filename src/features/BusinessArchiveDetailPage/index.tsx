'use client';

import {
  ArrowLeftOutlined,
  BookOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FullscreenOutlined,
  LeftOutlined,
  MessageOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Segmented } from '@lobehub/ui/base-ui';
import { Empty, Input, message, Spin, Tooltip, Typography } from 'antd';
import { createStaticStyles, cx } from 'antd-style';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import {
  type AiArchiveItem,
  type ArchiveCategory,
  type ArchivePageItem,
  getAiArchive,
  getArchiveCategories,
  getArchivePages,
} from '@/features/BusinessArchivePage/api';
import { ArchiveStatusBadge } from '@/features/BusinessArchivePage/components';
import {
  type EnterpriseArchive,
  type EnterpriseDetail,
  getEnterprise,
  getEnterpriseArchives,
} from '@/features/BusinessEnterprisePage/api';
import { useSession } from '@/libs/better-auth/auth-client';

const LIST_PATH = '/enforcement/archive';
const PAGE_SIZE = 500;

const styles = createStaticStyles(({ css }) => ({
  'aiBody': css`
    overflow: auto;
    flex: 1;

    min-height: 0;
    padding: 20px;

    background: #f8fafc;
  `,
  'aiCard': css`
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 5%);
  `,
  'aiCardBody': css`
    padding: 16px;
    color: #475569;

    .markdown-body,
    .markdown-body p {
      margin: 0;
      font-size: 14px;
      line-height: 1.7;
    }
  `,
  'aiCardHeader': css`
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding-block: 14px;
    padding-inline: 16px;
    border-block-end: 1px solid #f1f5f9;

    font-weight: 700;
    color: #7c3aed;
  `,
  'categoryHeader': css`
    cursor: pointer;

    display: flex;
    gap: 8px;
    align-items: center;

    padding-block: 9px;
    padding-inline: 10px;

    background: #f8fafc;

    transition: background 0.16s ease;

    &:hover {
      background: #f1f5f9;
    }
  `,
  'categoryItem': css`
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
  `,
  'chatPlaceholder': css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    min-height: 260px;
    padding: 24px;

    color: #94a3b8;
    text-align: center;
  `,
  'container': css`
    overflow: hidden;
    display: flex;
    flex-direction: column;

    height: 100%;
    min-height: 0;

    background: #f8fafc;
  `,
  'detailShell': css`
    overflow: hidden;
    display: flex;
    flex: 1;

    min-height: 0;
    border: 1px solid #e2e8f0;
    border-radius: 16px;

    background: #fff;
    box-shadow: 0 20px 40px rgb(15 23 42 / 10%);
  `,
  'emptyCenter': css`
    display: flex;
    align-items: center;
    justify-content: center;

    height: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 16px;

    background: #fff;
  `,
  'header': css`
    flex: none;
    padding-block: 16px 12px;
    padding-inline: 20px;
  `,
  'headerTitle': css`
    display: flex;
    flex: 1;
    gap: 12px;
    align-items: center;

    min-width: 0;
  `,
  'iconBox': css`
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
  'leftPanel': css`
    display: flex;
    flex-direction: column;

    width: 288px;
    min-width: 288px;
    border-inline-end: 1px solid #e2e8f0;

    background: #f8fafc;
  `,
  'leftPanelBody': css`
    overflow: auto;
    flex: 1;
    min-height: 0;
    padding: 8px;
  `,
  'leftPanelHeader': css`
    flex: none;
    padding: 16px;
    border-block-end: 1px solid #e2e8f0;
    background: #fff;
  `,
  'metaCard': css`
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
  `,
  'metaGrid': css`
    display: grid;
    gap: 8px;
    margin-block-start: 10px;
  `,
  'metaLabel': css`
    font-size: 12px;
    color: #64748b;
  `,
  'metaRow': css`
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 8px;

    font-size: 12px;
    color: #334155;
  `,
  'pageCanvas': css`
    overflow: auto;
    display: flex;
    flex: 1;
    justify-content: center;

    padding: 32px;

    background: rgb(241 245 249 / 55%);
  `,
  'pageImage': css`
    transform-origin: top center;

    max-width: 100%;

    background: #fff;
    box-shadow: 0 14px 26px rgb(15 23 42 / 18%);

    transition: transform 0.18s ease;
  `,
  'pagePlaceholder': css`
    display: flex;
    align-items: center;
    justify-content: center;

    width: min(620px, 100%);
    min-height: 680px;
    border: 1px solid #e2e8f0;

    color: #cbd5e1;

    background: #fff;
    box-shadow: 0 14px 26px rgb(15 23 42 / 10%);
  `,
  'pageTextPanel': css`
    overflow: hidden;
    flex: 1;

    min-width: 380px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;

    background: #fff;
    box-shadow: 0 14px 26px rgb(15 23 42 / 10%);
  `,
  'pageTextPre': css`
    overflow: auto;

    height: 100%;
    margin: 0;
    padding: 16px;

    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.7;
    color: #334155;
    white-space: pre-wrap;
  `,
  'previewPanel': css`
    display: flex;
    flex: 1;
    flex-direction: column;

    min-width: 0;

    background: #f1f5f9;
  `,
  'rightPanel': css`
    display: flex;
    flex-direction: column;

    width: 384px;
    min-width: 384px;
    border-inline-start: 1px solid #e2e8f0;

    background: #fff;
  `,
  'tabs': css`
    display: flex;
    flex: none;
    border-block-end: 1px solid #e2e8f0;
    background: #fff;
  `,
  'tabButton': css`
    cursor: pointer;

    flex: 1;

    padding-block: 13px;
    padding-inline: 8px;
    border: 0;
    border-block-end: 2px solid transparent;

    font-size: 14px;
    font-weight: 600;
    color: #64748b;

    background: transparent;

    transition: all 0.16s ease;

    &:hover {
      color: #334155;
    }
  `,
  'tabButtonActive': css`
    border-block-end-color: #10b981;
    color: #059669;
    background: rgb(236 253 245 / 55%);
  `,
  'thumbnailGrid': css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 16px;
    align-content: start;

    width: min(920px, 100%);
  `,
  'thumbnailItem': css`
    cursor: pointer;

    position: relative;

    overflow: hidden;

    aspect-ratio: 3 / 4;
    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #fff;

    transition: all 0.16s ease;

    &:hover {
      border-color: #10b981;
      box-shadow: 0 8px 18px rgb(15 23 42 / 12%);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  'thumbnailItemActive': css`
    border-color: #10b981;
    box-shadow: 0 0 0 2px #10b981;
  `,
  'toolbar': css`
    z-index: 1;

    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;

    min-height: 56px;
    padding-block: 10px;
    padding-inline: 14px;
    border-block-end: 1px solid #e2e8f0;

    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
  `,
  'toolbarActions': css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    justify-content: flex-end;

    color: #64748b;
  `,
  'toolbarDivider': css`
    width: 1px;
    height: 18px;
    margin-inline: 4px;
    background: #cbd5e1;
  `,
  'topRow': css`
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
  `,

  '@media (max-width: 1199px)': {
    detailShell: css`
      overflow: auto;
      flex-direction: column;
    `,
    leftPanel: css`
      width: 100%;
      min-width: 0;
      max-height: 320px;
      border-block-end: 1px solid #e2e8f0;
      border-inline-end: 0;
    `,
    previewPanel: css`
      flex: none;
      min-height: 620px;
    `,
    rightPanel: css`
      width: 100%;
      min-width: 0;
      min-height: 520px;
      border-block-start: 1px solid #e2e8f0;
      border-inline-start: 0;
    `,
  },
}));

type AiTab = 'guide' | 'chat';
type PreviewMode = 'page' | 'thumbnail';

interface CategoryGroup {
  archives: EnterpriseArchive[];
  code: string;
  name: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const getPageText = (page?: ArchivePageItem | null) =>
  page?.governed_parse_result || page?.parse_result || page?.content || '';

const resolveAssetUrl = (url?: string) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return url;
};

const groupArchives = (
  categories: ArchiveCategory[],
  archives: EnterpriseArchive[],
  currentCategoryCode?: string,
): CategoryGroup[] => {
  const grouped = new Map<string, EnterpriseArchive[]>();
  archives.forEach((archive) => {
    const key = archive.category_code || 'uncategorized';
    grouped.set(key, [...(grouped.get(key) || []), archive]);
  });

  const prefix = currentCategoryCode?.startsWith('01') ? '01' : '02';
  const categoryGroups = categories
    .filter((category) => category.code.startsWith(prefix))
    .map((category) => ({
      archives: grouped.get(category.code) || [],
      code: category.code,
      name: category.name,
    }));

  if ((grouped.get('uncategorized') || []).length > 0) {
    categoryGroups.push({
      archives: grouped.get('uncategorized') || [],
      code: 'uncategorized',
      name: '未分类',
    });
  }

  return categoryGroups.filter((group) => group.archives.length > 0);
};

const BusinessArchiveDetailPage = memo(() => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const archiveId = Number.parseInt(params.id || '', 10);

  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => (session as { accessToken?: string } | null | undefined)?.accessToken ?? null,
    [session],
  );

  const [archive, setArchive] = useState<AiArchiveItem | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [pages, setPages] = useState<ArchivePageItem[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [enterpriseArchives, setEnterpriseArchives] = useState<EnterpriseArchive[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());
  const [previewMode, setPreviewMode] = useState<PreviewMode>('page');
  const [showText, setShowText] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [aiTab, setAiTab] = useState<AiTab>('guide');
  const [chatInput, setChatInput] = useState('');

  const selectedPageNum = Number.parseInt(searchParams.get('pageNum') || '1', 10) || 1;

  const setSelectedPageNum = useCallback(
    (pageNum: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('pageNum', String(pageNum));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const loadArchive = useCallback(async () => {
    if (!Number.isFinite(archiveId) || archiveId <= 0) {
      setArchive(null);
      setArchiveLoading(false);
      return;
    }

    setArchiveLoading(true);
    try {
      const data = await getAiArchive(archiveId, authToken);
      setArchive(data);
    } catch (error) {
      setArchive(null);
      message.error(error instanceof Error ? error.message : '档案详情加载失败');
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveId, authToken]);

  const loadPages = useCallback(async () => {
    if (!Number.isFinite(archiveId) || archiveId <= 0) return;
    setPagesLoading(true);
    try {
      const result = await getArchivePages(archiveId, { page: 1, size: PAGE_SIZE }, authToken);
      setPages(result.list || []);
    } catch (error) {
      setPages([]);
      message.error(error instanceof Error ? error.message : '档案页面加载失败');
    } finally {
      setPagesLoading(false);
    }
  }, [archiveId, authToken]);

  useEffect(() => {
    if (isPending) return;
    void loadArchive();
    void loadPages();
  }, [isPending, loadArchive, loadPages]);

  useEffect(() => {
    if (isPending) return;
    getArchiveCategories(authToken)
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
  }, [authToken, isPending]);

  useEffect(() => {
    let active = true;
    const companyId = archive?.company_id;

    if (!companyId) {
      setEnterprise(null);
      setEnterpriseArchives([]);
      setRelatedLoading(false);
      return () => {
        active = false;
      };
    }

    setRelatedLoading(true);
    void Promise.all([
      getEnterprise(companyId, authToken),
      getEnterpriseArchives(companyId, authToken),
    ])
      .then(([enterpriseData, archivesData]) => {
        if (!active) return;
        setEnterprise(enterpriseData);
        setEnterpriseArchives(archivesData.list || []);
      })
      .catch(() => {
        if (!active) return;
        setEnterprise(null);
        setEnterpriseArchives([]);
      })
      .finally(() => {
        if (active) setRelatedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [archive?.company_id, authToken]);

  const currentPage = useMemo(
    () => pages.find((page) => page.page_num === selectedPageNum) || pages[0] || null,
    [pages, selectedPageNum],
  );
  const currentPageIndex = currentPage ? pages.findIndex((page) => page.id === currentPage.id) : -1;
  const totalPages = archive?.page_count || pages.length;
  const groupedArchives = useMemo(
    () => groupArchives(categories, enterpriseArchives, archive?.category_code),
    [archive?.category_code, categories, enterpriseArchives],
  );

  useEffect(() => {
    setExpandedCategories(new Set(groupedArchives.slice(0, 3).map((group) => group.code)));
  }, [groupedArchives]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(LIST_PATH);
  };

  const handlePrevPage = () => {
    const previous = pages[currentPageIndex - 1];
    if (previous) setSelectedPageNum(previous.page_num);
  };

  const handleNextPage = () => {
    const next = pages[currentPageIndex + 1];
    if (next) setSelectedPageNum(next.page_num);
  };

  const handleRefresh = () => {
    void loadArchive();
    void loadPages();
  };

  const handleOpenArchive = (id: number) => {
    navigate(`/enforcement/archive/${id}`);
  };

  const handleDownload = () => {
    message.info('下载原 PDF 的接口尚未接入新系统');
  };

  const toggleCategory = (code: string) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  if (isPending || archiveLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyCenter}>
          <Spin tip="正在加载档案详情..." />
        </div>
      </div>
    );
  }

  if (!archive) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回列表
          </Button>
        </div>
        <div className={styles.emptyCenter}>
          <Empty description="档案不存在或已被删除" />
        </div>
      </div>
    );
  }

  const pageText = getPageText(currentPage);
  const imageUrl = resolveAssetUrl(currentPage?.image_url);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回列表
          </Button>
          <div className={styles.headerTitle}>
            <div className={styles.iconBox}>
              <FileTextOutlined style={{ fontSize: 22 }} />
            </div>
            <div className="min-w-0">
              <Typography.Title className="!mb-0" ellipsis={{ tooltip: archive.title }} level={4}>
                {archive.title || '档案详情'}
              </Typography.Title>
              <Typography.Text type="secondary">
                档案 ID：{archiveId} · {archive.category_name || archive.category_code || '未分类'}{' '}
                · {archive.page_count ?? 0} 页
              </Typography.Text>
            </div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </div>
      </div>

      <div className={styles.detailShell}>
        <aside className={styles.leftPanel}>
          <div className={styles.leftPanelHeader}>
            <Button icon={<ArrowLeftOutlined />} type="link" onClick={handleBack}>
              返回列表
            </Button>
            <div className={styles.metaCard}>
              <Typography.Text strong>基本信息</Typography.Text>
              <div className={styles.metaGrid}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>文件编号</span>
                  <span>{archive.doc_no || '-'}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>年度</span>
                  <span>{archive.year || '-'}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>责任方</span>
                  <span>{archive.responsible_party || '-'}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>部门</span>
                  <span>{archive.dept_name || '-'}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>状态</span>
                  <span>
                    <ArchiveStatusBadge status={archive.process_status} />
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>创建时间</span>
                  <span>{formatDateTime(archive.create_time)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.leftPanelBody}>
            {!archive.company_id ? (
              <Empty description="该档案未关联企业" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : relatedLoading ? (
              <div className={styles.chatPlaceholder}>
                <Spin />
                <Typography.Text type="secondary">正在加载企业档案...</Typography.Text>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div className={styles.metaCard}>
                  <Typography.Text strong>{enterprise?.name || '关联企业'}</Typography.Text>
                  <div className={styles.metaGrid}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>信用代码</span>
                      <span>{enterprise?.enterprise_no || '-'}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>关联档案</span>
                      <span>{enterprise?.archive_count ?? enterpriseArchives.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                {groupedArchives.length === 0 ? (
                  <Empty description="暂无企业档案" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  groupedArchives.map((group) => {
                    const expanded = expandedCategories.has(group.code);
                    return (
                      <div className={styles.categoryItem} key={group.code}>
                        <div
                          className={styles.categoryHeader}
                          onClick={() => toggleCategory(group.code)}
                        >
                          <RightOutlined
                            style={{
                              color: '#64748b',
                              fontSize: 11,
                              transform: expanded ? 'rotate(90deg)' : undefined,
                              transition: 'transform 0.16s ease',
                            }}
                          />
                          <BookOutlined style={{ color: expanded ? '#059669' : '#94a3b8' }} />
                          <Typography.Text ellipsis strong style={{ flex: 1, fontSize: 12 }}>
                            {group.name}
                          </Typography.Text>
                          <Typography.Text style={{ fontSize: 12 }} type="secondary">
                            {group.archives.length}
                          </Typography.Text>
                        </div>
                        {expanded && (
                          <div style={{ display: 'grid', gap: 4, padding: 8 }}>
                            {group.archives.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                style={{
                                  background: item.id === archive.id ? '#ecfdf5' : 'transparent',
                                  border:
                                    item.id === archive.id
                                      ? '1px solid #a7f3d0'
                                      : '1px solid transparent',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  padding: 8,
                                  textAlign: 'left',
                                }}
                                onClick={() => handleOpenArchive(item.id)}
                              >
                                <Typography.Text
                                  ellipsis
                                  style={{ display: 'block', fontSize: 12 }}
                                >
                                  {item.title || '无标题'}
                                </Typography.Text>
                                <Typography.Text
                                  style={{ display: 'block', fontSize: 11 }}
                                  type="secondary"
                                >
                                  {item.doc_no || '-'}
                                </Typography.Text>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        <main className={styles.previewPanel}>
          <div className={styles.toolbar}>
            <Typography.Text strong>
              {currentPage ? `第 ${currentPage.page_num} 页` : archive.title || '档案预览'}
            </Typography.Text>
            <div className={styles.toolbarActions}>
              <Segmented
                size="small"
                value={previewMode}
                options={[
                  { icon: <FileImageOutlined />, label: '单页', value: 'page' },
                  { icon: <UnorderedListOutlined />, label: '缩略图', value: 'thumbnail' },
                ]}
                onChange={(value) => setPreviewMode(value as PreviewMode)}
              />
              <span className={styles.toolbarDivider} />
              <Tooltip title="缩小">
                <Button
                  icon={<MinusOutlined />}
                  size="small"
                  onClick={() => setZoom((value) => Math.max(50, value - 10))}
                />
              </Tooltip>
              <Typography.Text
                style={{ fontFamily: 'monospace', fontSize: 12, width: 44, textAlign: 'center' }}
              >
                {zoom}%
              </Typography.Text>
              <Tooltip title="放大">
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => setZoom((value) => Math.min(200, value + 10))}
                />
              </Tooltip>
              <span className={styles.toolbarDivider} />
              <Button
                disabled={currentPageIndex <= 0}
                icon={<LeftOutlined />}
                size="small"
                onClick={handlePrevPage}
              />
              <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {currentPage?.page_num || 0} / {totalPages || 0}
              </Typography.Text>
              <Button
                disabled={currentPageIndex < 0 || currentPageIndex >= pages.length - 1}
                icon={<RightOutlined />}
                size="small"
                onClick={handleNextPage}
              />
              <span className={styles.toolbarDivider} />
              <Tooltip title="显示解析结果">
                <Button
                  icon={<FullscreenOutlined />}
                  size="small"
                  type={showText ? 'primary' : 'default'}
                  onClick={() => setShowText((value) => !value)}
                />
              </Tooltip>
              <Tooltip title="下载PDF">
                <Button icon={<DownloadOutlined />} size="small" onClick={handleDownload} />
              </Tooltip>
            </div>
          </div>

          <Spin spinning={pagesLoading} wrapperClassName="archive-preview-spin">
            <div className={styles.pageCanvas}>
              {previewMode === 'thumbnail' ? (
                pages.length === 0 ? (
                  <Empty description="暂无页面数据" />
                ) : (
                  <div className={styles.thumbnailGrid}>
                    {pages.map((page) => {
                      const thumb = resolveAssetUrl(page.thumbnail_url || page.image_url);
                      return (
                        <div
                          key={page.id}
                          className={cx(
                            styles.thumbnailItem,
                            page.page_num === currentPage?.page_num && styles.thumbnailItemActive,
                          )}
                          onClick={() => {
                            setSelectedPageNum(page.page_num);
                            setPreviewMode('page');
                          }}
                        >
                          {thumb ? (
                            <img alt={`第${page.page_num}页`} src={thumb} />
                          ) : (
                            <FileTextOutlined style={{ fontSize: 34 }} />
                          )}
                          <div
                            style={{
                              background: 'rgb(255 255 255 / 86%)',
                              bottom: 8,
                              color: '#64748b',
                              fontSize: 12,
                              left: 0,
                              position: 'absolute',
                              right: 0,
                              textAlign: 'center',
                            }}
                          >
                            P{page.page_num}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : !currentPage ? (
                <Empty description="暂无页面数据" />
              ) : showText ? (
                <div style={{ display: 'flex', gap: 18, minHeight: '100%', width: '100%' }}>
                  <div style={{ display: 'flex', flex: 1, justifyContent: 'center', minWidth: 0 }}>
                    {imageUrl ? (
                      <img
                        alt={`第${currentPage.page_num}页`}
                        className={styles.pageImage}
                        src={imageUrl}
                        style={{ transform: `scale(${zoom / 100})` }}
                      />
                    ) : (
                      <div className={styles.pagePlaceholder}>
                        <FileSearchOutlined style={{ fontSize: 64 }} />
                      </div>
                    )}
                  </div>
                  <div className={styles.pageTextPanel}>
                    <div style={{ borderBottom: '1px solid #e2e8f0', padding: '10px 14px' }}>
                      <Typography.Text strong>解析结果</Typography.Text>
                      <Typography.Text style={{ float: 'right', fontSize: 12 }} type="secondary">
                        {currentPage.parse_status || 'pending'}
                      </Typography.Text>
                    </div>
                    <pre className={styles.pageTextPre}>{pageText || '暂无解析结果'}</pre>
                  </div>
                </div>
              ) : imageUrl ? (
                <img
                  alt={`第${currentPage.page_num}页`}
                  className={styles.pageImage}
                  src={imageUrl}
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              ) : (
                <div className={styles.pagePlaceholder}>
                  <FileSearchOutlined style={{ fontSize: 64 }} />
                </div>
              )}
            </div>
          </Spin>
        </main>

        <aside className={styles.rightPanel}>
          <div className={styles.tabs}>
            <button
              className={cx(styles.tabButton, aiTab === 'guide' && styles.tabButtonActive)}
              type="button"
              onClick={() => setAiTab('guide')}
            >
              AI导读
            </button>
            <button
              className={cx(styles.tabButton, aiTab === 'chat' && styles.tabButtonActive)}
              type="button"
              onClick={() => setAiTab('chat')}
            >
              当前档案问答
            </button>
          </div>

          {aiTab === 'guide' ? (
            <div className={styles.aiBody}>
              <div className={styles.aiCard}>
                <div className={styles.aiCardHeader}>
                  <span>AI导读</span>
                  <Button disabled icon={<ReloadOutlined />} size="small">
                    立即生成导读
                  </Button>
                </div>
                <div className={styles.aiCardBody}>
                  {archive.ai_guide ? (
                    <div className="markdown-body">
                      <ReactMarkdown>{archive.ai_guide}</ReactMarkdown>
                    </div>
                  ) : (
                    <Empty description="尚无导读" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </div>
              </div>

              <div className={styles.aiCard} style={{ marginTop: 16 }}>
                <div className={styles.aiCardHeader} style={{ color: '#334155' }}>
                  <span>档案信息</span>
                </div>
                <div className={styles.aiCardBody}>
                  <div className={styles.metaGrid}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>档案标题</span>
                      <span>{archive.title || '-'}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>分类</span>
                      <span>{archive.category_name || archive.category_code || '-'}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>页数</span>
                      <span>{archive.page_count ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={styles.aiBody}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div className={styles.chatPlaceholder}>
                <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <Typography.Text type="secondary">当前档案问答接口尚未接入新系统</Typography.Text>
                <Typography.Text style={{ fontSize: 12 }} type="secondary">
                  页面结构已按旧版保留，后续可直接接入流式问答。
                </Typography.Text>
              </div>
              <Input.TextArea
                autoSize={{ maxRows: 4, minRows: 3 }}
                placeholder="请输入关于当前档案的问题"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <Button disabled={!chatInput.trim()} type="primary">
                发送
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
});

BusinessArchiveDetailPage.displayName = 'BusinessArchiveDetailPage';

export default BusinessArchiveDetailPage;
