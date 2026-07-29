export const PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

/** 与旧版一致的默认排序：有标题优先 → 含“环评批复”优先 → 提取状态 → 页数 → id */
export const DEFAULT_SORT_FIELD = 'environmental_extract_status';
export const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

/** 档案分类（category_code 前缀）选项，对齐旧版 */
export const ARCHIVE_TYPE_OPTIONS = [
  { label: '01 企业档案', value: '01' },
  { label: '02 非企业档案', value: '02' },
];
