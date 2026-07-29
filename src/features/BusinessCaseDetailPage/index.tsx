'use client';

import {
  ArrowLeftOutlined,
  FileTextOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Tag, Typography, message } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import PagesBrowser from '@/features/BusinessArchiveDetailPage/PagesBrowser';
import {
  getCaseArchive,
  getCaseArchivePages,
  retryCaseArchiveProcess,
  type CaseArchiveItem,
} from '@/features/BusinessCasePage/api';
import { CaseStatusBadge } from '@/features/BusinessCasePage/components';
import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useSession } from '@/libs/better-auth/auth-client';

const LIST_PATH = '/enforcement/case';
const DETAIL_MAX_WIDTH = 1480;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const BusinessCaseDetailPage = memo(() => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const archiveId = Number.parseInt(params.id || '', 10);

  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => ((session as { accessToken?: string } | null | undefined)?.accessToken ?? null),
    [session],
  );

  const [archive, setArchive] = useState<CaseArchiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(archiveId) || archiveId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getCaseArchive(archiveId, authToken);
      setArchive(data);
    } catch (error) {
      setArchive(null);
      message.error(error instanceof Error ? error.message : '案卷详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [archiveId, authToken]);

  useEffect(() => {
    if (isPending) return;
    void load();
  }, [isPending, load]);

  const fetchPages = useCallback(
    (page: number, size: number) => getCaseArchivePages(archiveId, { page, size }, authToken),
    [archiveId, authToken],
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(LIST_PATH);
  };

  const handleRetry = async () => {
    if (!archive?.id) return;
    setRetrying(true);
    try {
      await retryCaseArchiveProcess(archive.id, authToken);
      message.success('案卷重新处理已启动');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新处理失败');
    } finally {
      setRetrying(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在加载案卷详情...
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <FileTextOutlined style={{ fontSize: 22 }} />
          </div>
          <div className="min-w-0 flex-1">
            <Typography.Title className="!mb-0" ellipsis={{ tooltip: archive?.title }} level={3}>
              {archive?.title || '案卷详情'}
            </Typography.Title>
            <Typography.Text type="secondary">案卷 ID：{archiveId || '—'}</Typography.Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
          <Button icon={<PlayCircleOutlined />} loading={retrying} onClick={handleRetry}>
            重新处理
          </Button>
        </div>

        {!archive ? (
          <Card bordered={false}>
            <Empty description="案卷不存在或已被删除" />
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card bordered={false} title="基本信息">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="案卷标题">{archive.title || '—'}</Descriptions.Item>
                  <Descriptions.Item label="文号">{archive.doc_no || '—'}</Descriptions.Item>
                  <Descriptions.Item label="年度">{archive.year || '—'}</Descriptions.Item>
                  <Descriptions.Item label="页数">{archive.page_count ?? 0} 页</Descriptions.Item>
                  <Descriptions.Item label="处理状态">
                    <CaseStatusBadge status={archive.process_status} />
                  </Descriptions.Item>
                  <Descriptions.Item label="分类编码">{archive.category_code || '—'}</Descriptions.Item>
                  <Descriptions.Item label="责任人">{archive.responsible_party || '—'}</Descriptions.Item>
                  <Descriptions.Item label="部门名称">{archive.dept_name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="附件名称">{archive.annex_name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">{formatDateTime(archive.create_time)}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{formatDateTime(archive.updated_at)}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card bordered={false} title="源文件">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="PDF 链接">
                    {archive.pdf_url ? (
                      <Typography.Link href={archive.pdf_url} target="_blank">
                        查看源文件
                      </Typography.Link>
                    ) : (
                      '—'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="备注">{archive.remarks || '—'}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card bordered={false} title="处理说明">
                <Tag color="blue">案卷页内容会与旧版保持同类布局</Tag>
                <div className="mt-3 text-sm leading-6 text-slate-600">
                  该页保留页内容浏览、源文件跳转和失败重试入口，避免把案卷详情压缩成单纯的列表行展开。
                </div>
              </Card>
            </div>

            <Card bordered={false} title="页内容">
              <PagesBrowser
                emptyDescription="该案卷暂无页级解析数据"
                errorDescription="案卷页内容加载失败"
                fetchPages={fetchPages}
                urlKey="case_page"
              />
            </Card>
          </div>
        )}
      </div>
    </BusinessPageContainer>
  );
});

BusinessCaseDetailPage.displayName = 'BusinessCaseDetailPage';

export default BusinessCaseDetailPage;
