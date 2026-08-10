'use client';

import { Button, Tabs } from '@lobehub/ui/base-ui';
import { Alert, Card, Empty, Typography } from 'antd';
import { cx } from 'antd-style';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useServerConfigStore } from '@/store/serverConfig';

import {
  type EnvironmentalAssessmentFactory,
  type EnvironmentalAssessmentProject,
  type EnvironmentalProjectModules,
} from '../BusinessEnterprisePage/api';
import { styles } from './styles';
import { formatValue } from './utils';

type ModuleKey = keyof EnvironmentalProjectModules;

interface ModuleConfig {
  columns: Array<[string, string]>;
  key: ModuleKey;
  title: string;
}

const moduleConfigs: ModuleConfig[] = [
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

const moduleConfigMap = new Map(moduleConfigs.map((config) => [config.key, config]));

/** 单条环评项目内部的子 Tab 分组：按污染要素归并 10 类模块表。 */
const PROJECT_SUB_TABS: Array<{ key: string; label: string; modules: ModuleKey[] }> = [
  { key: 'basic', label: '基本信息', modules: [] },
  { key: 'production', label: '产品工艺', modules: ['products', 'processes'] },
  { key: 'facility', label: '生产设施', modules: ['facilities', 'materials'] },
  { key: 'water', label: '废水', modules: ['effluent_equipments', 'effluent_outlets'] },
  { key: 'air', label: '废气', modules: ['fumes_equipments', 'fumes_outlets'] },
  {
    key: 'solid',
    label: '固废与总量',
    modules: ['solid_waste_facilities', 'pollution_discharges'],
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

const ProjectBasicInfo = memo(({ project }: { project: EnvironmentalAssessmentProject }) => {
  const basic = project.basic_info;

  return (
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
        <div className={styles.fieldValue}>{formatValue(basic.evaluation_file_type as number)}</div>
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
      <div>
        <div className={styles.fieldLabel}>关联档案编号</div>
        <div className={styles.fieldValue}>{formatValue(project.archive_doc_no)}</div>
      </div>
      <div>
        <div className={styles.fieldLabel}>档案收文时间</div>
        <div className={styles.fieldValue}>{formatValue(project.archive_receive_time)}</div>
      </div>
      <div>
        <div className={styles.fieldLabel}>档案 ID（锚点标识）</div>
        <div className={styles.fieldValue}>{formatValue(project.archive_id)}</div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <div className={styles.fieldLabel}>项目地址</div>
        <div className={styles.fieldValue}>{formatValue(basic.address as string)}</div>
      </div>
    </div>
  );
});

ProjectBasicInfo.displayName = 'ProjectBasicInfo';

interface FlatProject {
  factoryId: number;
  factoryName: string;
  key: string;
  project: EnvironmentalAssessmentProject;
}

interface EiaProjectsTabProps {
  factories: EnvironmentalAssessmentFactory[];
  onOpenArchive: (archiveId: number) => void;
  targetArchiveId?: number;
}

/**
 * Tab3 · 环评项目：左侧按厂区分组的项目列表，右侧单条项目详情（内嵌 6 个子 Tab）。
 * 支持通过 `targetArchiveId`（URL 上的 `#档案ID` 锚点）自动选中并滚动定位对应项目。
 */
const EiaProjectsTab = memo<EiaProjectsTabProps>(
  ({ factories, onOpenArchive, targetArchiveId }) => {
    const isMobile = useServerConfigStore((s) => s.isMobile);
    const flatProjects = useMemo<FlatProject[]>(
      () =>
        factories.flatMap((factory) =>
          (factory.projects || []).map((project) => ({
            factoryId: factory.id,
            factoryName: factory.factory_name || '未命名厂区',
            key: `${factory.id}-${project.id}`,
            project,
          })),
        ),
      [factories],
    );

    const [selectedKey, setSelectedKey] = useState<string | undefined>(() => flatProjects[0]?.key);
    const [subTab, setSubTab] = useState('basic');
    const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const anchorMatched = useMemo(() => {
      if (!targetArchiveId) return undefined;
      return flatProjects.find((item) => item.project.archive_id === targetArchiveId);
    }, [flatProjects, targetArchiveId]);

    useEffect(() => {
      if (flatProjects.length === 0) {
        setSelectedKey(undefined);
        return;
      }
      setSelectedKey((current) =>
        current && flatProjects.some((item) => item.key === current)
          ? current
          : flatProjects[0].key,
      );
    }, [flatProjects]);

    // 锚点命中时切换选中项并滚动到列表可视区域
    useEffect(() => {
      if (!anchorMatched) return;
      setSelectedKey(anchorMatched.key);
      setSubTab('basic');
      const node = itemRefs.current[anchorMatched.key];
      node?.scrollIntoView({ block: 'nearest' });
    }, [anchorMatched]);

    const selected = useMemo(
      () => flatProjects.find((item) => item.key === selectedKey) || flatProjects[0],
      [flatProjects, selectedKey],
    );

    const groupedByFactory = useMemo(() => {
      const groups = new Map<number, { items: FlatProject[]; name: string }>();
      flatProjects.forEach((item) => {
        const group = groups.get(item.factoryId) || { items: [], name: item.factoryName };
        group.items.push(item);
        groups.set(item.factoryId, group);
      });
      return [...groups.entries()];
    }, [flatProjects]);

    const registerRef = useCallback(
      (key: string) => (node: HTMLButtonElement | null) => {
        itemRefs.current[key] = node;
      },
      [],
    );

    if (flatProjects.length === 0) {
      return (
        <>
          {targetArchiveId ? (
            <Alert
              showIcon
              message={`未找到档案 ID ${targetArchiveId} 对应的环评项目`}
              style={{ marginBottom: 12 }}
              type="warning"
            />
          ) : null}
          <Empty description="该企业暂无环评项目数据" />
        </>
      );
    }

    return (
      <div>
        {targetArchiveId && !anchorMatched ? (
          <Alert
            showIcon
            message={`未找到档案 ID ${targetArchiveId} 对应的环评项目，已展示默认项目`}
            style={{ marginBottom: 12 }}
            type="warning"
          />
        ) : null}

        <div className={cx(styles.projectSplit, isMobile && styles.projectSplitMobile)}>
          <div className={cx(styles.projectListPanel, isMobile && styles.projectListPanelMobile)}>
            {groupedByFactory.map(([factoryId, group]) => (
              <div key={factoryId}>
                <div className={styles.projectFactoryLabel}>
                  {group.name}（{group.items.length}）
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    ref={registerRef(item.key)}
                    type="button"
                    className={cx(
                      styles.projectListItem,
                      selected?.key === item.key && styles.projectListItemActive,
                    )}
                    onClick={() => {
                      setSelectedKey(item.key);
                      setSubTab('basic');
                    }}
                  >
                    <div className={styles.projectListItemTitle}>
                      {formatValue(
                        (item.project.basic_info.project_name as string) ||
                          item.project.archive_title,
                      )}
                    </div>
                    <div className={styles.projectListItemMeta}>
                      {formatValue(item.project.archive_doc_no)} ·{' '}
                      {formatValue(item.project.archive_receive_time)}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className={cx(styles.projectDetail, isMobile && styles.projectDetailMobile)}>
            {selected ? (
              <>
                <div className={cx(styles.projectHeader, isMobile && styles.projectHeaderMobile)}>
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ fontSize: 15 }}>
                      {formatValue(
                        (selected.project.basic_info.project_name as string) ||
                          selected.project.archive_title,
                      )}
                    </Typography.Text>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                      {selected.factoryName} · {formatValue(selected.project.archive_doc_no)} ·{' '}
                      {formatValue(selected.project.archive_receive_time)}
                    </div>
                  </div>
                  {selected.project.archive_id ? (
                    <Button
                      size="small"
                      onClick={() => onOpenArchive(selected.project.archive_id!)}
                    >
                      查看档案
                    </Button>
                  ) : null}
                </div>

                <Tabs
                  activeKey={subTab}
                  size="small"
                  items={PROJECT_SUB_TABS.map((tab) => ({
                    children:
                      tab.key === 'basic' ? (
                        <ProjectBasicInfo project={selected.project} />
                      ) : (
                        <div className={styles.moduleGrid}>
                          {tab.modules.map((moduleKey) => {
                            const config = moduleConfigMap.get(moduleKey);
                            if (!config) return null;
                            return (
                              <ModuleTable
                                columns={config.columns}
                                key={config.key}
                                rows={selected.project.modules[config.key] || []}
                                title={config.title}
                              />
                            );
                          })}
                        </div>
                      ),
                    key: tab.key,
                    label: tab.label,
                  }))}
                  onChange={setSubTab}
                />
              </>
            ) : (
              <Empty description="请选择左侧环评项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>
      </div>
    );
  },
);

EiaProjectsTab.displayName = 'EiaProjectsTab';

export default EiaProjectsTab;
