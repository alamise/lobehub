'use client';

import { Button } from '@lobehub/ui/base-ui';
import { Empty, Input, Pagination, Typography } from 'antd';
import { cx } from 'antd-style';
import { FolderOpen } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { styles } from './styles';
import { type CategoryGroup } from './utils';

const ARCHIVE_PAGE_SIZE = 10;

interface ArchiveListTabProps {
  activeCategoryCode: string;
  categoryStructure: CategoryGroup[];
  keyword: string;
  onOpenArchive: (archiveId: number) => void;
  onUpdateParams: (updates: Record<string, string | null>) => void;
  page: number;
}

/**
 * Tab2 · 档案列表：顶部分类胶囊 + 下方档案清单。
 * 分类筛选、关键词搜索、分页、查看档案跳转等能力与改造前完全一致，
 * 仅把原左侧分类导航栏改为横向胶囊，清单占满整行宽度。
 */
const ArchiveListTab = memo<ArchiveListTabProps>(
  ({ activeCategoryCode, categoryStructure, keyword, onOpenArchive, onUpdateParams, page }) => {
    const [searchInput, setSearchInput] = useState(keyword);

    useEffect(() => {
      setSearchInput(keyword);
    }, [keyword]);

    const activeCategory = useMemo(
      () =>
        categoryStructure.find((category) => category.code === activeCategoryCode) ||
        categoryStructure[0] ||
        null,
      [activeCategoryCode, categoryStructure],
    );

    const filteredArchives = useMemo(() => {
      if (!activeCategory) return [];
      const normalized = keyword.trim().toLowerCase();
      if (!normalized) return activeCategory.archives;
      return activeCategory.archives.filter((archive) =>
        `${archive.title || ''} ${archive.doc_no || ''}`.toLowerCase().includes(normalized),
      );
    }, [activeCategory, keyword]);

    const totalPages = Math.max(1, Math.ceil(filteredArchives.length / ARCHIVE_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const pagedArchives = filteredArchives.slice(
      (safePage - 1) * ARCHIVE_PAGE_SIZE,
      safePage * ARCHIVE_PAGE_SIZE,
    );

    if (categoryStructure.length === 0) {
      return <Empty description="该企业暂无关联档案" />;
    }

    return (
      <div>
        <div className={styles.categoryChipRow}>
          {categoryStructure.map((category) => (
            <button
              key={category.code}
              type="button"
              className={cx(
                styles.categoryChip,
                activeCategory?.code === category.code && styles.categoryChipActive,
              )}
              onClick={() => onUpdateParams({ category: category.code, keyword: null, page: '1' })}
            >
              <FolderOpen size={14} />
              <span>{category.name}</span>
              <span className={styles.categoryChipCount}>{category.archives.length}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchBar}>
          <Input
            allowClear
            placeholder="根据档案标题或文件编号搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={() => onUpdateParams({ keyword: searchInput.trim() || null, page: '1' })}
          />
          <Button
            type="primary"
            onClick={() => onUpdateParams({ keyword: searchInput.trim() || null, page: '1' })}
          >
            搜索
          </Button>
          {keyword ? (
            <Button
              onClick={() => {
                setSearchInput('');
                onUpdateParams({ keyword: null, page: '1' });
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
                  <td colSpan={4} style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>
                    未找到匹配的档案
                  </td>
                </tr>
              ) : (
                pagedArchives.map((archive) => (
                  <tr key={archive.id} onClick={() => onOpenArchive(archive.id)}>
                    <td>
                      <Typography.Text strong>{archive.title || '无标题'}</Typography.Text>
                    </td>
                    <td>{archive.doc_no || '-'}</td>
                    <td>{archive.year || '-'}</td>
                    <td>
                      <Button
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenArchive(archive.id);
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
            current={safePage}
            pageSize={ARCHIVE_PAGE_SIZE}
            showSizeChanger={false}
            total={filteredArchives.length}
            onChange={(nextPage) => onUpdateParams({ page: String(nextPage) })}
          />
        </div>
      </div>
    );
  },
);

ArchiveListTab.displayName = 'ArchiveListTab';

export default ArchiveListTab;
