import { type ArchiveCategory } from '@/features/BusinessArchivePage/api';

import {
  type EnterpriseArchive,
  type EnterpriseDetail,
  type UpdateEnterpriseRequest,
} from '../BusinessEnterprisePage/api';

export interface CategoryGroup {
  archives: EnterpriseArchive[];
  code: string;
  name: string;
}

export const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

export const buildFormState = (enterprise: EnterpriseDetail): UpdateEnterpriseRequest => ({
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

export const groupArchives = (
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

/**
 * 解析企业详情页锚点：`#12345` 中的纯数字即环评项目绑定的档案 ID。
 *
 * 实现方式对齐 `BusinessArchiveDetailPage/utils.ts` 的 `parseArchivePageHash`：
 * 去掉前导 `#` 后做一次校验，非法值统一返回 undefined，由调用方决定降级行为。
 */
export const parseEnterpriseArchiveHash = (hash: string): number | undefined => {
  const normalized = hash.trim().replace(/^#/, '');
  if (!/^\d+$/.test(normalized)) return undefined;

  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};
