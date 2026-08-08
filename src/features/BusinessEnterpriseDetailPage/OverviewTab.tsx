'use client';

import { SaveOutlined } from '@ant-design/icons';
import { Button } from '@lobehub/ui/base-ui';
import { Card, Empty, Input, Typography } from 'antd';
import { Building2, Factory } from 'lucide-react';
import { memo } from 'react';

import {
  type EnterpriseDetail,
  type EnterpriseFactory,
  type EnvironmentalAssessmentFactory,
  type UpdateEnterpriseRequest,
} from '../BusinessEnterprisePage/api';
import { styles } from './styles';
import { formatValue } from './utils';

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

interface OverviewTabProps {
  editing: boolean;
  enterprise: EnterpriseDetail;
  factories: Array<EnterpriseFactory | EnvironmentalAssessmentFactory>;
  form: UpdateEnterpriseRequest;
  onCancelEdit: () => void;
  onFormChange: (patch: Partial<UpdateEnterpriseRequest>) => void;
  onSave: () => void;
  onStartEdit: () => void;
  saving: boolean;
}

/**
 * Tab1 · 企业概览：企业基础信息（可编辑）+ 厂区信息。
 * 厂区下的环评项目已迁移至「环评项目」Tab，此处仅展示厂区本身的属性。
 */
const OverviewTab = memo<OverviewTabProps>(
  ({
    editing,
    enterprise,
    factories,
    form,
    onCancelEdit,
    onFormChange,
    onSave,
    onStartEdit,
    saving,
  }) => (
    <div>
      <Card
        variant="borderless"
        extra={
          editing ? (
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <Button onClick={onCancelEdit}>取消</Button>
              <Button icon={<SaveOutlined />} loading={saving} type="primary" onClick={onSave}>
                保存
              </Button>
            </span>
          ) : (
            <Button onClick={onStartEdit}>编辑</Button>
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
          onChange={onFormChange}
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
                <Typography.Text strong>{factory.factory_name || '未命名厂区'}</Typography.Text>
                <div className={styles.fieldGrid} style={{ marginTop: 12 }}>
                  <div>
                    <div className={styles.fieldLabel}>行政区划</div>
                    <div className={styles.fieldValue}>{formatValue(factory.region_name)}</div>
                  </div>
                  <div>
                    <div className={styles.fieldLabel}>运行状态</div>
                    <div className={styles.fieldValue}>{formatValue(factory.run_status)}</div>
                  </div>
                  <div>
                    <div className={styles.fieldLabel}>污染物类型</div>
                    <div className={styles.fieldValue}>{formatValue(factory.pollutant_type)}</div>
                  </div>
                  <div>
                    <div className={styles.fieldLabel}>经纬度</div>
                    <div className={styles.fieldValue}>
                      {factory.wgs_lon || factory.wgs_lat
                        ? `${factory.wgs_lon || '-'}, ${factory.wgs_lat || '-'}`
                        : '-'}
                    </div>
                  </div>
                  <div>
                    <div className={styles.fieldLabel}>环评项目数</div>
                    <div className={styles.fieldValue}>
                      {'projects' in factory ? factory.projects.length : 0}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.fieldLabel}>地址</div>
                    <div className={styles.fieldValue}>{formatValue(factory.address)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ),
);

OverviewTab.displayName = 'OverviewTab';

export default OverviewTab;
