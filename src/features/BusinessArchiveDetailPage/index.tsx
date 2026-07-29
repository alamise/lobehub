'use client';

import {
  ArrowLeftOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  List,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import ReactMarkdown from 'react-markdown';

import {
  getAiArchive,
  getArchivePages,
  type AiArchiveItem,
} from '@/features/BusinessArchivePage/api';
import { ArchiveStatusBadge } from '@/features/BusinessArchivePage/components';
import BusinessPageContainer from '@/features/BusinessPageContainer';
import {
  getEnterprise,
  getEnterpriseArchives,
  type EnterpriseArchive,
  type EnterpriseDetail,
} from '@/features/BusinessEnterprisePage/api';
import { useSession } from '@/libs/better-auth/auth-client';

import PagesBrowser from './PagesBrowser';

const LIST_PATH = '/enforcement/archive';
const DETAIL_MAX_WIDTH = 1480;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const groupArchivesByCategory = (archives: EnterpriseArchive[]) => {
  const grouped = new Map<string, EnterpriseArchive[]>();
  archives.forEach((archive) => {
    const key = archive.category_name || archive.category_code || '未分类';
    const list = grouped.get(key) || [];
    list.push(archive);
    grouped.set(key, list);
  });
  return Array.from(grouped.entries()).map(([label, items]) => ({ items, label }));
};

const BusinessArchiveDetailPage = memo(() => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const archiveId = Number.parseInt(params.id || '', 10);

  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => ((session as { accessToken?: string } | null | undefined)?.accessToken ?? null),
    [session],
  );

  const [archive, setArchive] = useState<AiArchiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [enterpriseArchives, setEnterpriseArchives] = useState<EnterpriseArchive[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(archiveId) || archiveId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getAiArchive(archiveId, authToken);
      setArchive(data);
    } catch (error) {
      setArchive(null);
      message.error(error instanceof Error ? error.message : '档案详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [archiveId, authToken]);

  useEffect(() => {
    if (isPending) return;
    void load();
  }, [isPending, load]);

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
    void Promise.all([getEnterprise(companyId, authToken), getEnterpriseArchives(companyId, authToken)])
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

  const fetchPages = useCallback(
    (page: number, size: number) => getArchivePages(archiveId, { page, size }, authToken),
    [archiveId, authToken],
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(LIST_PATH);
  };

  const handleOpenArchive = (id: number) => {
    navigate(`/enforcement/archive/${id}`);
  };

  const groupedArchives = useMemo(
    () => groupArchivesByCategory(enterpriseArchives),
    [enterpriseArchives],
  );

  if (isPending || loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在加载档案详情...
      </div>
    );
  }

  return (
    <BusinessPageContainer maxWidth={DETAIL_MAX_WIDTH}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回列表
          </Button>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileTextOutlined style={{ fontSize: 22 }} />
          </div>
          <div className="min-w-0 flex-1">
            <Typography.Title className="!mb-0" ellipsis={{ tooltip: archive?.title }} level={3}>
              {archive?.title || '档案详情'}
            </Typography.Title>
            <Typography.Text type="secondary">档案 ID：{archiveId || '—'}</Typography.Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
        </div>

        {!archive ? (
          <Card bordered={false}>
            <Empty description="档案不存在或已被删除" />
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card bordered={false} title="基本信息">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="档案标题">{archive.title || '—'}</Descriptions.Item>
                  <Descriptions.Item label="文件编号">{archive.doc_no || '—'}</Descriptions.Item>
                  <Descriptions.Item label="年度">{archive.year || '—'}</Descriptions.Item>
                  <Descriptions.Item label="页数">{archive.page_count ?? 0} 页</Descriptions.Item>
                  <Descriptions.Item label="档案分类">
                    {archive.category_name || archive.category_code || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="责任方">{archive.responsible_party || '—'}</Descriptions.Item>
                  <Descriptions.Item label="部门名称">{archive.dept_name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="处理状态">
                    <ArchiveStatusBadge status={archive.process_status} />
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{formatDateTime(archive.create_time)}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card bordered={false} title="AI 导读">
                {archive.ai_guide ? (
                  <div className="text-sm leading-6 text-slate-700">
                    <ReactMarkdown>{archive.ai_guide}</ReactMarkdown>
                  </div>
                ) : (
                  <Empty description="暂无导读内容" />
                )}
              </Card>

              <Card
                bordered={false}
                title="关联企业"
                extra={
                  archive.company_id ? (
                    <Tag color="geekblue">企业 ID {archive.company_id}</Tag>
                  ) : (
                    <Tag>未关联</Tag>
                  )
                }
              >
                {archive.company_id ? (
                  <Spin spinning={relatedLoading}>
                    <div className="space-y-4">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="企业名称">{enterprise?.name || '—'}</Descriptions.Item>
                        <Descriptions.Item label="统一社会信用代码">
                          {enterprise?.enterprise_no || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="法人代表">
                          {enterprise?.legal_person || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="行政区划">
                          {enterprise?.region_name || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="地址">{enterprise?.address || '—'}</Descriptions.Item>
                        <Descriptions.Item label="关联档案数">
                          {enterprise?.archive_count ?? enterpriseArchives.length ?? 0}
                        </Descriptions.Item>
                      </Descriptions>

                      {groupedArchives.length > 0 ? (
                        <Collapse
                          bordered={false}
                          defaultActiveKey={groupedArchives[0]?.label ? [groupedArchives[0].label] : []}
                          items={groupedArchives.map((group) => ({
                            key: group.label,
                            label: `${group.label} (${group.items.length})`,
                            children: (
                              <List
                                dataSource={group.items}
                                renderItem={(item) => (
                                  <List.Item className="!px-0">
                                    <button
                                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                        item.id === archive.id
                                          ? 'border-emerald-300 bg-emerald-50'
                                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                      }`}
                                      onClick={() => handleOpenArchive(item.id)}
                                      type="button"
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-800">
                                          {item.title || '未命名档案'}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">
                                          {item.doc_no || '—'} · {item.year || '—'} ·{' '}
                                          {item.category_name || item.category_code || '未分类'}
                                        </div>
                                      </div>
                                    </button>
                                  </List.Item>
                                )}
                              />
                            ),
                          }))}
                        />
                      ) : (
                        <Empty description="暂无关联档案" />
                      )}
                    </div>
                  </Spin>
                ) : (
                  <Empty description="该档案未关联企业" />
                )}
              </Card>
            </div>

            <Card bordered={false} title="页内容">
              <PagesBrowser fetchPages={fetchPages} urlKey="archive_page" />
            </Card>
          </div>
        )}
      </div>
    </BusinessPageContainer>
  );
});

BusinessArchiveDetailPage.displayName = 'BusinessArchiveDetailPage';

export default BusinessArchiveDetailPage;
