import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Select } from '@lobehub/ui/base-ui';
import { Input } from 'antd';
import { memo, useMemo } from 'react';

import type { ArchiveCategory } from '../api';
import { ARCHIVE_TYPE_OPTIONS } from '../constants';

export interface ArchiveFilterDraft {
  categoryCode: string;
  categoryPrefix: string;
  docNo: string;
  title: string;
  year: string;
}

interface Props {
  categories: ArchiveCategory[];
  draft: ArchiveFilterDraft;
  hasFilter: boolean;
  loading?: boolean;
  onClear: () => void;
  onDraftChange: (patch: Partial<ArchiveFilterDraft>) => void;
  onSearch: () => void;
}

/** 分类层级：code 每 2 位一级（0101 为 01 下的一级） */
const getCategoryLevel = (code: string) => Math.max(0, Math.floor(code.trim().length / 2) - 1);

export const SearchToolbar = memo<Props>(
  ({ categories, draft, hasFilter, loading, onClear, onDraftChange, onSearch }) => {
    // 文件分类：按档案分类（01/02）分组、code 排序、层级缩进，并随档案分类联动过滤
    const groupedCategoryOptions = useMemo(
      () =>
        ARCHIVE_TYPE_OPTIONS.map((group) => ({
          label: group.label,
          options: categories
            .filter((category) => category.code.startsWith(group.value))
            .filter((category) =>
              draft.categoryPrefix ? category.code.startsWith(draft.categoryPrefix) : true,
            )
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((category) => ({
              label: (
                <span
                  style={{ paddingLeft: Math.max(0, getCategoryLevel(category.code) - 1) * 12 }}
                >
                  {category.code} {category.name}
                </span>
              ),
              value: category.code,
            })),
        })).filter((group) => group.options.length > 0),
      [categories, draft.categoryPrefix],
    );

    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_110px_170px_220px_auto] xl:items-end">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs text-slate-500">文件标题</span>
            <Input
              allowClear
              className="h-10"
              placeholder="输入标题关键词..."
              value={draft.title}
              onChange={(e) => onDraftChange({ title: e.target.value })}
              onPressEnter={onSearch}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs text-slate-500">文件编号</span>
            <Input
              allowClear
              className="h-10"
              placeholder="输入文号..."
              value={draft.docNo}
              onChange={(e) => onDraftChange({ docNo: e.target.value })}
              onPressEnter={onSearch}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs text-slate-500">年度</span>
            <Input
              allowClear
              className="h-10"
              placeholder="如 2024"
              value={draft.year}
              onChange={(e) => onDraftChange({ year: e.target.value })}
              onPressEnter={onSearch}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs text-slate-500">档案分类</span>
            <Select
              allowClear
              className="h-10 w-full"
              options={ARCHIVE_TYPE_OPTIONS}
              placeholder="全部档案"
              value={draft.categoryPrefix || undefined}
              onChange={(value) => {
                const next = value || '';
                onDraftChange({
                  categoryPrefix: next,
                  ...(draft.categoryCode && next && !draft.categoryCode.startsWith(next)
                    ? { categoryCode: '' }
                    : {}),
                });
              }}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs text-slate-500">文件分类</span>
            <Select
              allowClear
              className="h-10 w-full"
              listHeight={320}
              options={groupedCategoryOptions}
              placeholder="全部分类"
              popupMatchSelectWidth={320}
              value={draft.categoryCode || undefined}
              onChange={(value) => onDraftChange({ categoryCode: value || '' })}
            />
          </label>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row xl:col-span-1">
            <Button icon={<SearchOutlined />} loading={loading} type="primary" onClick={onSearch}>
              搜索
            </Button>
            {hasFilter && (
              <Button icon={<ClearOutlined />} onClick={onClear}>
                清空
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

SearchToolbar.displayName = 'SearchToolbar';
