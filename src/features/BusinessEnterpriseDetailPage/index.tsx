'use client';

import {
  ArrowLeftOutlined,
  BookOutlined,
  FileTextOutlined,
  HomeOutlined,
  MessageOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Button } from '@lobehub/ui/base-ui';
import { Card, Empty, Input, message, Pagination, Spin, Typography } from 'antd';
import { createStaticStyles, cx } from 'antd-style';
import { Building2, Factory, FolderOpen } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { type ArchiveCategory, getArchiveCategories } from '@/features/BusinessArchivePage/api';
import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useSession } from '@/libs/better-auth/auth-client';

import {
  type EnterpriseArchive,
  type EnterpriseDetail,
  type EnterpriseFactory,
  type EnvironmentalAssessmentProject,
  getEnterprise,
  getEnterpriseArchives,
  getEnterpriseGuideQuestions,
  updateEnterprise,
  type UpdateEnterpriseRequest,
} from '../BusinessEnterprisePage/api';

const ARCHIVE_PAGE_SIZE = 10;
const LIST_PATH = '/enforcement/company';

const styles = createStaticStyles(({ css }) => ({
  'aiBody': css`
    overflow: auto;
    flex: 1;

    min-height: 0;
    padding: 16px;

    background: #f8fafc;
  `,
  'archiveTable': css`
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;

    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 13px;
    }

    th {
      padding-block: 12px;
      padding-inline: 16px;
      border-block-end: 1px solid #e2e8f0;

      color: #64748b;
      text-align: start;

      background: #f8fafc;
    }

    td {
      padding-block: 12px;
      padding-inline: 16px;
      border-block-end: 1px solid #f1f5f9;

      color: #334155;
      vertical-align: top;
    }

    tr:last-child td {
      border-block-end: 0;
    }

    tbody tr {
      cursor: pointer;
    }

    tbody tr:hover {
      background: #f8fafc;
    }
  `,
  'categoryButton': css`
    cursor: pointer;

    display: flex;
    gap: 10px;
    align-items: center;

    width: 100%;
    padding-block: 10px;
    padding-inline: 12px;
    border: 0;
    border-radius: 10px;

    color: #334155;
    text-align: start;

    background: transparent;

    transition: all 0.16s ease;

    &:hover {
      background: #f8fafc;
    }
  `,
  'categoryButtonActive': css`
    color: #047857;
    background: #ecfdf5;
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
  'factoryItem': css`
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
  `,
  'moduleGrid': css`
    display: grid;
    gap: 12px;
  `,
  'moduleTable': css`
    overflow: auto;
    border: 1px solid #e2e8f0;
    border-radius: 10px;

    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 680px;
      font-size: 12px;
    }

    th {
      padding-block: 10px;
      padding-inline: 12px;
      border-block-end: 1px solid #e2e8f0;

      color: #64748b;
      text-align: start;

      background: #f8fafc;
    }

    td {
      padding-block: 10px;
      padding-inline: 12px;
      border-block-end: 1px solid #f1f5f9;

      color: #334155;
      vertical-align: top;
    }

    tr:last-child td {
      border-block-end: 0;
    }
  `,
  'projectCard': css`
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #f8fafc;
  `,
  'projectHeader': css`
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;

    padding: 14px;
    border-block-end: 1px solid #e2e8f0;

    background: #fff;
  `,
  'fieldGrid': css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;

    @media (width <= 1280px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  'fieldItem': css`
    min-width: 0;
  `,
  'fieldLabel': css`
    margin-block-end: 6px;
    font-size: 12px;
    color: #64748b;
  `,
  'fieldValue': css`
    font-size: 14px;
    color: #1e293b;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
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
    overflow: hidden;
    display: flex;
    flex-direction: column;

    width: 288px;
    min-width: 288px;
    min-height: 0;
    border-inline-end: 1px solid #e2e8f0;

    background: #f8fafc;
  `,
  'leftPanelBody': css`
    overflow: auto;
    flex: 1;
    min-height: 0;
    padding: 10px;
  `,
  'leftPanelHeader': css`
    flex: none;
    padding: 16px;
    border-block-end: 1px solid #e2e8f0;
    background: #fff;
  `,
  'mainPanel': css`
    overflow: auto;
    flex: 1;

    min-width: 0;
    min-height: 0;

    background: #f8fafc;
  `,
  'mainPanelInner': css`
    width: min(1680px, 100%);
    margin-block: 0;
    margin-inline: auto;
    padding: 24px;
  `,
  'navCard': css`
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
  `,
  'navCardHeader': css`
    display: flex;
    gap: 8px;
    align-items: center;

    padding-block: 10px;
    padding-inline: 12px;
    border-block-end: 1px solid #f1f5f9;

    font-size: 12px;
    font-weight: 700;
    color: #64748b;
  `,
  'pageHero': css`
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    margin-block-end: 16px;
    padding: 22px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;

    background: #fff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
  `,
  'rightPanel': css`
    overflow: hidden;
    display: flex;
    flex-direction: column;

    width: 384px;
    min-width: 384px;
    min-height: 0;
    border-inline-start: 1px solid #e2e8f0;

    background: #fff;
  `,
  'searchBar': css`
    display: flex;
    gap: 8px;

    margin-block: 16px;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;

    background: #fff;
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
      max-height: 360px;
      border-block-end: 1px solid #e2e8f0;
      border-inline-end: 0;
    `,
    rightPanel: css`
      width: 100%;
      min-width: 0;
      min-height: 420px;
      border-block-start: 1px solid #e2e8f0;
      border-inline-start: 0;
    `,
  },
}));

interface CategoryGroup {
  archives: EnterpriseArchive[];
  code: string;
  name: string;
}

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const buildFormState = (enterprise: EnterpriseDetail): UpdateEnterpriseRequest => ({
  address: enterprise.address || '',
  business_license: enterprise.business_license || '',
  contact_name: enterprise.contact_name || '',
  contact_phone: enterprise.contact_phone || '',
  enterprise_no: enterprise.enterprise_no || '',
  former_name: enterprise.former_name || '',
  industry: enterprise.industry || '',
  legal_person: enterprise.legal_person || '',
  name: enterprise.name || '',
  phone: enterprise.phone || '',
  region_name: enterprise.region_name || '',
});

const groupArchives = (
  categories: ArchiveCategory[],
  archives: EnterpriseArchive[],
): CategoryGroup[] => {
  const grouped = new Map<string, EnterpriseArchive[]>();
  archives.forEach((archive) => {
    const code = archive.category_code || 'uncategorized';
    grouped.set(code, [...(grouped.get(code) || []), archive]);
  });

  const result = categories
    .filter((category) => grouped.has(category.code))
    .map((category) => ({
      archives: grouped.get(category.code) || [],
      code: category.code,
      name: category.name,
    }));

  if (grouped.has('uncategorized')) {
    result.push({
      archives: grouped.get('uncategorized') || [],
      code: 'uncategorized',
      name: '未分类',
    });
  }

  return result;
};

const EnterpriseFields = memo(
  ({
    editing,
    enterprise,
    form,
    onChange,
  }: {
    editing: boolean;
    enterprise: EnterpriseDetail;
    form: UpdateEnterpriseRequest;
    onChange: (patch: Partial<UpdateEnterpriseRequest>) => void;
  }) => {
    const fields: Array<{
      key: keyof UpdateEnterpriseRequest;
      label: string;
      multiline?: boolean;
    }> = [
      { key: 'name', label: '企业名称' },
      { key: 'former_name', label: '曾用名' },
      { key: 'enterprise_no', label: '统一社会信用代码' },
      { key: 'business_license', label: '纳税人识别号' },
      { key: 'legal_person', label: '法人代表' },
      { key: 'contact_name', label: '联系人' },
      { key: 'contact_phone', label: '联系人电话' },
      { key: 'phone', label: '联系电话' },
      { key: 'industry', label: '所属行业' },
      { key: 'region_name', label: '所在区域' },
      { key: 'address', label: '企业地址', multiline: true },
    ];

    return (
      <div className={styles.fieldGrid}>
        {fields.map((field) => (
          <div className={styles.fieldItem} key={field.key}>
            <div className={styles.fieldLabel}>{field.label}</div>
            {editing ? (
              field.multiline ? (
                <Input.TextArea
                  autoSize={{ maxRows: 4, minRows: 2 }}
                  value={form[field.key]}
                  onChange={(event) => onChange({ [field.key]: event.target.value })}
                />
              ) : (
                <Input
                  value={form[field.key]}
                  onChange={(event) => onChange({ [field.key]: event.target.value })}
                />
              )
            ) : (
              <div className={styles.fieldValue}>
                {formatValue(enterprise[field.key as keyof EnterpriseDetail] as string)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
);

EnterpriseFields.displayName = 'EnterpriseFields';

const moduleConfigs: Array<{
  columns: Array<[string, string]>;
  key: keyof EnvironmentalAssessmentProject['modules'];
  title: string;
}> = [
  {
    columns: [
      ['approval_product_name', '审批产品名称'],
      ['approval_productivity', '审批生产能力'],
      ['unit_name', '单位'],
    ],
    key: 'products',
    title: '主要产品产能',
  },
  {
    columns: [
      ['name', '工艺名称'],
      ['description', '工艺说明'],
      ['flow', '工艺流程'],
    ],
    key: 'processes',
    title: '生产工艺',
  },
  {
    columns: [
      ['approval_facility_name', '审批生产设施名称'],
      ['approval_facility_count', '审批数量'],
      ['facility_model', '型号/规格'],
      ['unit_name', '单位'],
    ],
    key: 'facilities',
    title: '主要生产设施',
  },
  {
    columns: [
      ['category', '物料用途'],
      ['approval_material_name', '审批物料名称'],
      ['spec_param', '规格参数'],
      ['approval_use_amount', '审批用量'],
      ['unit_name', '单位'],
    ],
    key: 'materials',
    title: '原料辅料',
  },
  {
    columns: [
      ['effluent_equipment_no', '设施编号'],
      ['effluent_equipment_name', '设施名称'],
      ['effluent_equipment_technics', '治理工艺'],
      ['effluent_equipment_ability', '处理能力'],
      ['effluent_equipment_location', '位置'],
    ],
    key: 'effluent_equipments',
    title: '废水治理设施',
  },
  {
    columns: [
      ['effluent_outlet_no', '排放口编号'],
      ['effluent_outlet_name', '排放口名称'],
      ['effluent_outlet_pattern', '排放规律'],
      ['effluent_outlet_direction', '排放去向'],
      ['effluent_outlet_location', '位置'],
    ],
    key: 'effluent_outlets',
    title: '废水排放口',
  },
  {
    columns: [
      ['fumes_equipment_no', '设施编号'],
      ['fumes_equipment_name', '设施名称'],
      ['fumes_equipment_technics', '治理工艺'],
      ['fumes_equipment_ability', '处理能力'],
      ['fumes_equipment_location', '位置'],
    ],
    key: 'fumes_equipments',
    title: '废气治理设施',
  },
  {
    columns: [
      ['fumes_outlet_no', '排放口编号'],
      ['fumes_outlet_name', '排放口名称'],
      ['fumes_outlet_pattern', '排放规律'],
      ['fumes_outlet_high', '排放口高度'],
      ['fumes_outlet_inner_diameter', '内径'],
      ['fumes_outlet_location', '位置'],
    ],
    key: 'fumes_outlets',
    title: '废气排放口',
  },
  {
    columns: [
      ['name', '设施名称'],
      ['no', '设施编号'],
      ['scale', '规模'],
      ['location', '位置'],
    ],
    key: 'solid_waste_facilities',
    title: '固废堆场设施',
  },
  {
    columns: [
      ['pollution_discharge_type', '类别'],
      ['pollution_discharge_name', '污染物名称'],
      ['pollution_discharge_approval_amount', '审批排放总量'],
      ['pollution_discharge_unit_name', '单位'],
    ],
    key: 'pollution_discharges',
    title: '污染物排放总量',
  },
];

const ModuleTable = memo(
  ({
    columns,
    rows,
    title,
  }: {
    columns: Array<[string, string]>;
    rows: Record<string, unknown>[];
    title: string;
  }) => (
    <Card size="small" title={title}>
      {rows.length === 0 ? (
        <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className={styles.moduleTable}>
          <table>
            <thead>
              <tr>
                {columns.map(([, label]) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id || index)}>
                  {columns.map(([key, label]) => (
                    <td key={label}>{formatValue(row[key] as string | number | null)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  ),
);

ModuleTable.displayName = 'ModuleTable';

const ProjectCard = memo(
  ({
    onOpenArchive,
    project,
  }: {
    onOpenArchive: (archiveId: number) => void;
    project: EnvironmentalAssessmentProject;
  }) => {
    const basic = project.basic_info;
    const hasAnyModule = moduleConfigs.some((config) => project.modules[config.key]?.length > 0);

    return (
      <div className={styles.projectCard}>
        <div className={styles.projectHeader}>
          <div className="min-w-0">
            <Typography.Text strong>
              {formatValue((basic.project_name as string) || project.archive_title)}
            </Typography.Text>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              {formatValue(project.archive_doc_no)} · {formatValue(project.archive_receive_time)}
            </div>
          </div>
          {project.archive_id ? (
            <Button size="small" onClick={() => onOpenArchive(project.archive_id!)}>
              查看档案
            </Button>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: 12, padding: 14 }}>
          <div className={styles.fieldGrid}>
            <div>
              <div className={styles.fieldLabel}>建设性质</div>
              <div className={styles.fieldValue}>{formatValue(basic.project_nature as number)}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>项目状态</div>
              <div className={styles.fieldValue}>{formatValue(basic.project_status as number)}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>环评文件类型</div>
              <div className={styles.fieldValue}>
                {formatValue(basic.evaluation_file_type as number)}
              </div>
            </div>
            <div>
              <div className={styles.fieldLabel}>项目总投资（万元）</div>
              <div className={styles.fieldValue}>
                {formatValue(basic.total_project_investment as number)}
              </div>
            </div>
            <div>
              <div className={styles.fieldLabel}>环保投资（万元）</div>
              <div className={styles.fieldValue}>
                {formatValue(basic.total_environmental_investment as number)}
              </div>
            </div>
            <div>
              <div className={styles.fieldLabel}>批复文号</div>
              <div className={styles.fieldValue}>{formatValue(basic.approval_no as string)}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className={styles.fieldLabel}>项目地址</div>
              <div className={styles.fieldValue}>{formatValue(basic.address as string)}</div>
            </div>
          </div>

          {hasAnyModule ? (
            <div className={styles.moduleGrid}>
              {moduleConfigs.map((config) => (
                <ModuleTable
                  columns={config.columns}
                  key={config.key}
                  rows={project.modules[config.key] || []}
                  title={config.title}
                />
              ))}
            </div>
          ) : (
            <Empty description="暂无环评项目模块数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </div>
    );
  },
);

ProjectCard.displayName = 'ProjectCard';

const BusinessEnterpriseDetailPage = memo(() => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const enterpriseId = Number(id);

  const { data: session, isPending } = useSession();
  const authToken = useMemo(
    () => (session as { accessToken?: string } | null | undefined)?.accessToken ?? null,
    [session],
  );

  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [archives, setArchives] = useState<EnterpriseArchive[]>([]);
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [guideQuestions, setGuideQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateEnterpriseRequest | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [archiveSearchInput, setArchiveSearchInput] = useState(searchParams.get('keyword') || '');

  const activeView = searchParams.get('view') === 'category' ? 'category' : 'home';
  const activeCategoryCode = searchParams.get('category') || '';
  const archiveKeyword = searchParams.get('keyword') || '';
  const archivePage = Math.max(1, Number(searchParams.get('page') || 1));

  const loadData = useCallback(
    async (refresh = false) => {
      if (!enterpriseId) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [enterpriseData, archivesData, categoryData, questionsData] = await Promise.all([
          getEnterprise(enterpriseId, authToken),
          getEnterpriseArchives(enterpriseId, authToken),
          getArchiveCategories(authToken),
          getEnterpriseGuideQuestions(enterpriseId, authToken),
        ]);
        setEnterprise(enterpriseData);
        setForm(buildFormState(enterpriseData));
        setArchives(archivesData.list || []);
        setCategories(categoryData || []);
        setGuideQuestions(questionsData.questions || []);
      } catch (error) {
        setEnterprise(null);
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
    setArchiveSearchInput(archiveKeyword);
  }, [archiveKeyword]);

  const categoryStructure = useMemo(
    () => groupArchives(categories, archives),
    [archives, categories],
  );
  const activeCategory = useMemo(
    () => categoryStructure.find((category) => category.code === activeCategoryCode) || null,
    [activeCategoryCode, categoryStructure],
  );

  const filteredArchives = useMemo(() => {
    if (!activeCategory) return [];
    const keyword = archiveKeyword.trim().toLowerCase();
    if (!keyword) return activeCategory.archives;
    return activeCategory.archives.filter((archive) =>
      `${archive.title || ''} ${archive.doc_no || ''}`.toLowerCase().includes(keyword),
    );
  }, [activeCategory, archiveKeyword]);

  const totalArchivePages = Math.max(1, Math.ceil(filteredArchives.length / ARCHIVE_PAGE_SIZE));
  const safeArchivePage = Math.min(archivePage, totalArchivePages);
  const pagedArchives = filteredArchives.slice(
    (safeArchivePage - 1) * ARCHIVE_PAGE_SIZE,
    safeArchivePage * ARCHIVE_PAGE_SIZE,
  );

  const factories: EnterpriseFactory[] = enterprise?.factories || [];

  const updateViewParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  };

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

  const handleOpenArchive = (archiveId: number) => {
    navigate(`/enforcement/archive/${archiveId}`);
  };

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
        <div className={styles.header}>
          <div className={styles.topRow}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              返回企业列表
            </Button>
            <div className={styles.headerTitle}>
              <div className={styles.iconBox}>
                <Building2 size={22} />
              </div>
              <div className="min-w-0">
                <Typography.Title
                  className="!mb-0"
                  ellipsis={{ tooltip: enterprise.name }}
                  level={4}
                >
                  {enterprise.name || '企业详情'}
                </Typography.Title>
                <Typography.Text type="secondary">
                  企业 ID：{enterprise.id} · 关联档案 {archives.length} 份 · 厂区 {factories.length}{' '}
                  个
                </Typography.Text>
              </div>
            </div>
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => loadData(true)}>
              刷新数据
            </Button>
          </div>
        </div>

        <div className={styles.detailShell}>
          <aside className={styles.leftPanel}>
            <div className={styles.leftPanelHeader}>
              <Button icon={<ArrowLeftOutlined />} type="link" onClick={handleBack}>
                返回企业列表
              </Button>
              <div className={styles.navCard} style={{ marginTop: 12 }}>
                <div className={styles.navCardHeader}>
                  <FileTextOutlined />
                  企业导航
                </div>
                <div style={{ padding: 8 }}>
                  <button
                    type="button"
                    className={cx(
                      styles.categoryButton,
                      activeView === 'home' && styles.categoryButtonActive,
                    )}
                    onClick={() =>
                      updateViewParams({ category: null, keyword: null, page: null, view: 'home' })
                    }
                  >
                    <HomeOutlined />
                    <span style={{ flex: 1 }}>企业主页</span>
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.leftPanelBody}>
              <div className={styles.navCard}>
                <div className={styles.navCardHeader}>
                  <BookOutlined />
                  企业档案分类
                </div>
                <div style={{ display: 'grid', gap: 4, padding: 8 }}>
                  {categoryStructure.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, padding: 12 }}>暂无企业档案</div>
                  ) : (
                    categoryStructure.map((category) => (
                      <button
                        key={category.code}
                        type="button"
                        className={cx(
                          styles.categoryButton,
                          activeView === 'category' &&
                            activeCategoryCode === category.code &&
                            styles.categoryButtonActive,
                        )}
                        onClick={() =>
                          updateViewParams({
                            category: category.code,
                            keyword: null,
                            page: '1',
                            view: 'category',
                          })
                        }
                      >
                        <FolderOpen size={16} />
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {category.name}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>
                          {category.archives.length}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>

          <main className={styles.mainPanel}>
            <div className={styles.mainPanelInner}>
              {activeView === 'category' && activeCategory ? (
                <>
                  <div className={styles.pageHero}>
                    <div>
                      <Typography.Text type="secondary">企业档案分类</Typography.Text>
                      <Typography.Title className="!mb-0" level={3}>
                        {activeCategory.name}
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        当前分类共 {activeCategory.archives.length} 份档案
                      </Typography.Text>
                    </div>
                  </div>

                  <div className={styles.searchBar}>
                    <Input
                      allowClear
                      placeholder="根据档案标题或文件编号搜索"
                      value={archiveSearchInput}
                      onChange={(event) => setArchiveSearchInput(event.target.value)}
                      onPressEnter={() =>
                        updateViewParams({
                          keyword: archiveSearchInput.trim() || null,
                          page: '1',
                        })
                      }
                    />
                    <Button
                      type="primary"
                      onClick={() =>
                        updateViewParams({
                          keyword: archiveSearchInput.trim() || null,
                          page: '1',
                        })
                      }
                    >
                      搜索
                    </Button>
                    {archiveKeyword ? (
                      <Button
                        onClick={() => {
                          setArchiveSearchInput('');
                          updateViewParams({ keyword: null, page: '1' });
                        }}
                      >
                        清空
                      </Button>
                    ) : null}
                  </div>

                  <div className={styles.archiveTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>档案标题</th>
                          <th>文件编号</th>
                          <th>年份</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedArchives.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}
                            >
                              未找到匹配的档案
                            </td>
                          </tr>
                        ) : (
                          pagedArchives.map((archive) => (
                            <tr key={archive.id} onClick={() => handleOpenArchive(archive.id)}>
                              <td>
                                <Typography.Text strong>
                                  {archive.title || '无标题'}
                                </Typography.Text>
                              </td>
                              <td>{archive.doc_no || '-'}</td>
                              <td>{archive.year || '-'}</td>
                              <td>
                                <Button
                                  size="small"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenArchive(archive.id);
                                  }}
                                >
                                  查看档案
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <Pagination
                      current={safeArchivePage}
                      pageSize={ARCHIVE_PAGE_SIZE}
                      showSizeChanger={false}
                      total={filteredArchives.length}
                      onChange={(page) => updateViewParams({ page: String(page) })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.pageHero}>
                    <div>
                      <Typography.Text type="secondary">
                        更新时间：{formatDateTime(enterprise.update_time)}
                      </Typography.Text>
                      <Typography.Title className="!mb-0" level={3}>
                        <span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}>
                          <Building2 color="#059669" size={28} />
                          企业详情
                        </span>
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        {enterprise.name || '暂无数据'} · 共 {factories.length} 个厂区，
                        {archives.length} 份企业档案
                      </Typography.Text>
                    </div>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={refreshing}
                      onClick={() => loadData(true)}
                    >
                      刷新数据
                    </Button>
                  </div>

                  <Card
                    bordered={false}
                    extra={
                      editing ? (
                        <span style={{ display: 'inline-flex', gap: 8 }}>
                          <Button
                            onClick={() => {
                              setForm(buildFormState(enterprise));
                              setEditing(false);
                            }}
                          >
                            取消
                          </Button>
                          <Button
                            icon={<SaveOutlined />}
                            loading={saving}
                            type="primary"
                            onClick={handleSave}
                          >
                            保存
                          </Button>
                        </span>
                      ) : (
                        <Button onClick={() => setEditing(true)}>编辑</Button>
                      )
                    }
                    title={
                      <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
                        <Building2 color="#059669" size={18} />
                        企业基础信息
                      </span>
                    }
                  >
                    <EnterpriseFields
                      editing={editing}
                      enterprise={enterprise}
                      form={form}
                      onChange={(patch) =>
                        setForm((current) => ({ ...(current || form), ...patch }))
                      }
                    />
                  </Card>

                  <div style={{ marginTop: 18 }}>
                    <Typography.Title level={4}>
                      <span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}>
                        <Factory color="#059669" size={22} />
                        厂区信息
                      </span>
                    </Typography.Title>
                    {factories.length === 0 ? (
                      <Empty description="暂无厂区信息" />
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {factories.map((factory) => (
                          <div className={styles.factoryItem} key={factory.id}>
                            <Typography.Text strong>
                              {factory.factory_name || '未命名厂区'}
                            </Typography.Text>
                            <div className={styles.fieldGrid} style={{ marginTop: 12 }}>
                              <div>
                                <div className={styles.fieldLabel}>行政区划</div>
                                <div className={styles.fieldValue}>
                                  {formatValue(factory.region_name)}
                                </div>
                              </div>
                              <div>
                                <div className={styles.fieldLabel}>运行状态</div>
                                <div className={styles.fieldValue}>
                                  {formatValue(factory.run_status)}
                                </div>
                              </div>
                              <div>
                                <div className={styles.fieldLabel}>污染物类型</div>
                                <div className={styles.fieldValue}>
                                  {formatValue(factory.pollutant_type)}
                                </div>
                              </div>
                              <div>
                                <div className={styles.fieldLabel}>经纬度</div>
                                <div className={styles.fieldValue}>
                                  {factory.wgs_lon || factory.wgs_lat
                                    ? `${factory.wgs_lon || '-'}, ${factory.wgs_lat || '-'}`
                                    : '-'}
                                </div>
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div className={styles.fieldLabel}>地址</div>
                                <div className={styles.fieldValue}>
                                  {formatValue(factory.address)}
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <Empty
                                description="环评项目模块接口尚未迁移到新系统"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </main>

          <aside className={styles.rightPanel}>
            <div
              style={{
                borderBottom: '2px solid #10b981',
                color: '#059669',
                fontWeight: 700,
                padding: 14,
                textAlign: 'center',
              }}
            >
              <MessageOutlined style={{ marginRight: 8 }} />
              当前企业问答
            </div>
            <div className={styles.aiBody}>
              {archives[0]?.id ? (
                <>
                  <Card bordered={false} size="small" title="引导问题">
                    {guideQuestions.length === 0 ? (
                      <Empty description="暂无引导问题" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {guideQuestions.map((question) => (
                          <Button
                            key={question}
                            style={{
                              height: 'auto',
                              justifyContent: 'flex-start',
                              whiteSpace: 'normal',
                            }}
                            onClick={() => setChatInput(question)}
                          >
                            {question}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                  <div style={{ marginTop: 14 }}>
                    <Empty
                      description="企业问答流式接口尚未接入新系统"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </div>
                  <Input.TextArea
                    autoSize={{ maxRows: 4, minRows: 3 }}
                    placeholder="请输入关于当前企业的问题"
                    style={{ marginTop: 14 }}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                  />
                  <Button
                    disabled={!chatInput.trim()}
                    style={{ marginTop: 10, width: '100%' }}
                    type="primary"
                  >
                    发送
                  </Button>
                </>
              ) : (
                <Empty description="当前企业暂无可用于问答的档案" />
              )}
            </div>
          </aside>
        </div>
      </div>
    </BusinessPageContainer>
  );
});

BusinessEnterpriseDetailPage.displayName = 'BusinessEnterpriseDetailPage';

export default BusinessEnterpriseDetailPage;
