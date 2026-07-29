'use client';

import { Button, Input } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { memo } from 'react';

interface SearchToolbarProps {
  loading?: boolean;
  search: string;
  setSearch: (v: string) => void;
  onRefresh?: () => void;
  onSearch?: () => void;
}

const SearchToolbar = memo<SearchToolbarProps>(
  ({ loading, search, setSearch, onRefresh, onSearch }) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        allowClear
        className="sm:max-w-md"
        placeholder="按标题、正文、来源名称或链接搜索"
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onPressEnter={onSearch}
      />
      <div className="flex items-center gap-2">
        <Button icon={<SearchOutlined />} type="primary" loading={loading} onClick={onSearch}>
          搜索
        </Button>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
          重置
        </Button>
      </div>
    </div>
  ),
);

SearchToolbar.displayName = 'MinisterSearchToolbar';

export default SearchToolbar;
