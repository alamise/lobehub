'use client';

import { ArrowLeftOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Tabs } from '@lobehub/ui/base-ui';
import { Empty, message, Spin, Typography } from 'antd';
import { cx } from 'antd-style';
import { Building2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { type ArchiveCategory, getArchiveCategories } from '@/features/BusinessArchivePage/api';
import BusinessNativeChatPanel from '@/features/BusinessNativeChatPanel';
import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useSession } from '@/libs/better-auth/auth-client';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

import {
  type EnterpriseArchive,
  type EnterpriseDetail,
  type EnterpriseEnvironmentalAssessmentTree,
  type EnterpriseFactory,
  type EnvironmentalAssessmentFactory,
  getEnterprise,
  getEnterpriseArchives,
  getEnterpriseEnvironmentalAssessment,
  getEnterpriseGuideQuestions,
  updateEnterprise,
  type UpdateEnterpriseRequest,
} from '../BusinessEnterprisePage/api';
import ArchiveListTab from './ArchiveListTab';
import EiaProjectsTab from './EiaProjectsTab';
import OverviewTab from './OverviewTab';
import { styles } from './styles';
import { buildFormState, formatDateTime, groupArchives, parseEnterpriseArchiveHash } from './utils';

const LIST_PATH = '/enforcement/company';

type TabKey = 'overview' | 'archives' | 'eia' | 'chat';

const TAB_KEYS: TabKey[] = ['overview', 'archives', 'eia', 'chat'];

const BusinessEnterpriseDetailPage = memo(() => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const enterpriseId = Number(id);

  const { data: session, isPending } = useSession();
  const enterpriseAgentId = useServerConfigStore(serverConfigSelectors.businessEnterpriseAgentId);
  const isMobile = useServerConfigStore((s) => s.isMobile);
  const authToken = useMemo(
    () => (session as { accessToken?: string } | null | undefined)?.accessToken ?? null,
    [session],
  );

  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [assessment, setAssessment] = useState<EnterpriseEnvironmentalAssessmentTree | null>(null);
  const [archives, setArchives] = useState<EnterpriseArchive[]>([]);
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [guideQuestions, setGuideQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateEnterpriseRequest | null>(null);

  // 锚点：URL 上的 `#档案ID`（纯数字）指向某条环评项目，识别方式与档案详情页 hash 方案一致
  const [hashArchiveId, setHashArchiveId] = useState<number | undefined>(() =>
    typeof window === 'undefined' ? undefined : parseEnterpriseArchiveHash(window.location.hash),
  );

  const paramTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = hashArchiveId
    ? 'eia'
    : paramTab && TAB_KEYS.includes(paramTab)
      ? paramTab
      : 'overview';

  const activeCategoryCode = searchParams.get('category') || '';
  const archiveKeyword = searchParams.get('keyword') || '';
  const archivePage = Math.max(1, Number(searchParams.get('page') || 1));

  const loadData = useCallback(
    async (refresh = false) => {
      if (!enterpriseId) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const enterpriseData = await getEnterprise(enterpriseId, authToken);
        const [assessmentResult, archivesResult, categoryResult, questionsResult] =
          await Promise.allSettled([
            getEnterpriseEnvironmentalAssessment(enterpriseId, authToken),
            getEnterpriseArchives(enterpriseId, authToken),
            getArchiveCategories(authToken),
            getEnterpriseGuideQuestions(enterpriseId, authToken),
          ]);

        setEnterprise(enterpriseData);
        setForm(buildFormState(enterpriseData));
        setAssessment(assessmentResult.status === 'fulfilled' ? assessmentResult.value : null);
        setArchives(archivesResult.status === 'fulfilled' ? archivesResult.value.list || [] : []);
        setCategories(categoryResult.status === 'fulfilled' ? categoryResult.value || [] : []);
        setGuideQuestions(
          questionsResult.status === 'fulfilled' ? questionsResult.value.questions || [] : [],
        );

        const degraded =
          assessmentResult.status === 'rejected' ||
          archivesResult.status === 'rejected' ||
          categoryResult.status === 'rejected' ||
          questionsResult.status === 'rejected';
        if (degraded) message.warning('企业详情部分模块加载失败，已显示可用数据');
      } catch (error) {
        setEnterprise(null);
        setAssessment(null);
        setArchives([]);
        message.error(error instanceof Error ? error.message : '企业详情加载失败');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authToken, enterpriseId],
  );

  useEffect(() => {
    if (isPending) return;
    void loadData(false);
  }, [isPending, loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncArchiveHash = () => {
      setHashArchiveId(parseEnterpriseArchiveHash(window.location.hash));
    };

    syncArchiveHash();
    window.addEventListener('hashchange', syncArchiveHash);
    return () => window.removeEventListener('hashchange', syncArchiveHash);
  }, [enterpriseId]);

  const categoryStructure = useMemo(
    () => groupArchives(categories, archives),
    [archives, categories],
  );

  const factories: Array<EnterpriseFactory | EnvironmentalAssessmentFactory> =
    assessment?.factories || enterprise?.factories || [];
  const eiaFactories: EnvironmentalAssessmentFactory[] = assessment?.factories || [];
  const eiaProjectCount = eiaFactories.reduce(
    (total, factory) => total + (factory.projects?.length || 0),
    0,
  );

  const updateViewParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // 手动切换 Tab 时清掉锚点，避免锚点持续把页面锁在环评项目 Tab
  const handleTabChange = useCallback(
    (key: string) => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const query = searchParams.toString();
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${query ? `?${query}` : ''}`,
        );
      }
      setHashArchiveId(undefined);
      updateViewParams({ tab: key });
    },
    [searchParams, updateViewParams],
  );

  const handleSave = async () => {
    if (!enterprise || !form) return;
    if (!form.name.trim()) {
      message.warning('企业名称不能为空');
      return;
    }

    setSaving(true);
    try {
      await updateEnterprise(enterprise.id, form, authToken);
      await loadData(true);
      setEditing(false);
      message.success('企业基础信息已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenArchive = useCallback(
    (archiveId: number) => {
      navigate(`/enforcement/archive/${archiveId}`);
    },
    [navigate],
  );

  const handleBack = () => {
    navigate(LIST_PATH);
  };

  if (isPending || loading) {
    return (
      <BusinessPageContainer>
        <div className={styles.emptyCenter}>
          <Spin tip="正在加载企业详情..." />
        </div>
      </BusinessPageContainer>
    );
  }

  if (!enterprise || !form) {
    return (
      <BusinessPageContainer>
        <div className={styles.emptyCenter}>
          <Empty description="企业不存在或已被删除">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              返回企业列表
            </Button>
          </Empty>
        </div>
      </BusinessPageContainer>
    );
  }

  return (
    <BusinessPageContainer maxWidth={1720}>
      <div className={styles.container}>
        <div className={cx(styles.headerCard, isMobile && styles.headerCardMobile)}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回企业列表
          </Button>
          <div className={cx(styles.headerTitle, isMobile && styles.headerTitleMobile)}>
            <div className={styles.iconBox}>
              <Building2 size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Typography.Title className="!mb-0" ellipsis={{ tooltip: enterprise.name }} level={4}>
                {enterprise.name || '企业详情'}
              </Typography.Title>
              <Typography.Text type="secondary">
                企业 ID：{enterprise.id} · 档案 {archives.length} 份 · 厂区 {factories.length} 个 ·
                环评项目 {eiaProjectCount} 个
                {assessment?.update_time
                  ? ` · 更新于 ${formatDateTime(assessment.update_time)}`
                  : ''}
              </Typography.Text>
            </div>
          </div>
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => loadData(true)}>
            刷新数据
          </Button>
        </div>

        <div className={cx(styles.tabCard, isMobile && styles.tabCardMobile)}>
          <Tabs
            activeKey={activeTab}
            items={[
              {
                children: (
                  <OverviewTab
                    editing={editing}
                    enterprise={enterprise}
                    factories={factories}
                    form={form}
                    saving={saving}
                    onSave={handleSave}
                    onStartEdit={() => setEditing(true)}
                    onCancelEdit={() => {
                      setForm(buildFormState(enterprise));
                      setEditing(false);
                    }}
                    onFormChange={(patch) =>
                      setForm((current) => ({ ...(current || form), ...patch }))
                    }
                  />
                ),
                key: 'overview',
                label: '企业概览',
              },
              {
                children: (
                  <ArchiveListTab
                    activeCategoryCode={activeCategoryCode}
                    categoryStructure={categoryStructure}
                    keyword={archiveKeyword}
                    page={archivePage}
                    onOpenArchive={handleOpenArchive}
                    onUpdateParams={updateViewParams}
                  />
                ),
                key: 'archives',
                label: `档案列表（${archives.length}）`,
              },
              {
                children: (
                  <EiaProjectsTab
                    factories={eiaFactories}
                    targetArchiveId={hashArchiveId}
                    onOpenArchive={handleOpenArchive}
                  />
                ),
                key: 'eia',
                label: `环评项目（${eiaProjectCount}）`,
              },
              {
                children: (
                  <div className={cx(styles.chatShell, isMobile && styles.chatShellMobile)}>
                    <div className={styles.chatShellHeader}>
                      <MessageOutlined style={{ marginRight: 8 }} />
                      当前企业问答
                    </div>
                    <div
                      className={cx(styles.chatShellBody, isMobile && styles.chatShellBodyMobile)}
                    >
                      <BusinessNativeChatPanel
                        agentId={enterpriseAgentId}
                        contextId={String(enterprise.id)}
                        emptyText="请输入关于当前企业的问题"
                        guideQuestions={guideQuestions}
                        kind="enterprise"
                        title="当前企业问答"
                      />
                    </div>
                  </div>
                ),
                key: 'chat',
                label: '企业问答',
              },
            ]}
            onChange={handleTabChange}
          />
        </div>
      </div>
    </BusinessPageContainer>
  );
});

BusinessEnterpriseDetailPage.displayName = 'BusinessEnterpriseDetailPage';

export default BusinessEnterpriseDetailPage;
