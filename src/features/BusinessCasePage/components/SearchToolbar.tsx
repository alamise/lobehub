'use client';

import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space } from 'antd';
import { memo } from 'react';

interface SearchToolbarProps {
  loading?: boolean;
  onRefresh: () => void;
  onSearch: () => void;
  onUpload: () => void;
  search: string;
  setSearch: (value: string) => void;
}

const SearchToolbar = memo(
  ({ loading, onRefresh, onSearch, onUpload, search, setSearch }: SearchToolbarProps) => {
    return (
      <Space wrap className="w-full justify-between sm:justify-start">
        <Space.Compact>
          <Input
            allowClear
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={onSearch}
            placeholder="搜索标题 / 文号"
            prefix={<SearchOutlined className="text-slate-400" />}
            style={{ width: 320 }}
            value={search}
          />
          <Button onClick={onSearch}>搜索</Button>
        </Space.Compact>

        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
            刷新
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={onUpload}>
            上传新案卷
          </Button>
        </Space>
      </Space>
    );
  },
);

SearchToolbar.displayName = 'SearchToolbar';

export default SearchToolbar;
