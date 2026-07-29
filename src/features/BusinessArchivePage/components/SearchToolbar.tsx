import { Button, Input, Select, Space } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
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
                <span style={{ paddingLeft: Math.max(0, getCategoryLevel(category.code) - 1) * 12 }}>
                  {category.code} {category.name}
                </span>
              ),
              value: category.code,
            })),
        })).filter((group) => group.options.length > 0),
      [categories, draft.categoryPrefix],
    );

    return (
      <Space wrap>
        <Input
          allowClear
          onChange={(e) => onDraftChange({ title: e.target.value })}
          onPressEnter={onSearch}
          placeholder="文件标题关键词"
          style={{ width: 200 }}
          value={draft.title}
        />
        <Input
          allowClear
          onChange={(e) => onDraftChange({ docNo: e.target.value })}
          onPressEnter={onSearch}
          placeholder="文件编号"
          style={{ width: 160 }}
          value={draft.docNo}
        />
        <Input
          allowClear
          onChange={(e) => onDraftChange({ year: e.target.value })}
          onPressEnter={onSearch}
          placeholder="年度，如 2024"
          style={{ width: 120 }}
          value={draft.year}
        />
        <Select
          allowClear
          onChange={(value) => {
            const next = value || '';
            onDraftChange({
              categoryPrefix: next,
              ...(draft.categoryCode && next && !draft.categoryCode.startsWith(next)
                ? { categoryCode: '' }
                : {}),
            });
          }}
          options={ARCHIVE_TYPE_OPTIONS}
          placeholder="档案分类"
          style={{ width: 150 }}
          value={draft.categoryPrefix || undefined}
        />
        <Select
          allowClear
          listHeight={320}
          onChange={(value) => onDraftChange({ categoryCode: value || '' })}
          options={groupedCategoryOptions}
          placeholder="文件分类"
          popupMatchSelectWidth={320}
          style={{ width: 220 }}
          value={draft.categoryCode || undefined}
        />
        <Button icon={<SearchOutlined />} loading={loading} onClick={onSearch} type="primary">
          搜索
        </Button>
        {hasFilter && (
          <Button icon={<ClearOutlined />} onClick={onClear}>
            清空
          </Button>
        )}
      </Space>
    );
  },
);

SearchToolbar.displayName = 'SearchToolbar';
