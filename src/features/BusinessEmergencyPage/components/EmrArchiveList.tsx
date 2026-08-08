import { FileTextOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button } from '@lobehub/ui/base-ui';
import { Card, Empty, Input, message, Pagination, Space, Spin, Tag, Typography } from 'antd';
import { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useUrlPage } from '@/hooks/useUrlPage';

import { type EmrArchiveItem, getEmrArchives } from '../api';
import { PAGE_SIZE } from '../constants';

const EmrArchiveList = memo(() => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useUrlPage('archive_page');
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<EmrArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEmrArchives({ page, search: keyword || undefined, size: PAGE_SIZE });
      setItems(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      setItems([]);
      setTotal(0);
      message.error(error instanceof Error ? error.message : '应急档案加载失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Space wrap>
        <Input
          allowClear
          placeholder="智能搜索应急档案 / 预案"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={() => {
            setPage(1);
            setKeyword(search.trim());
          }}
        />
        <Typography.Text type="secondary">共 {total} 条</Typography.Text>
        <Button icon={<ReloadOutlined />} loading={loading} type="text" onClick={load} />
      </Space>

      <Spin spinning={loading}>
        {items.length === 0 ? (
          <Empty description="暂无应急档案" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((item) => (
              <Card
                hoverable
                bordered={false}
                className="shadow-sm"
                key={item.id}
                size="small"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/enforcement/archive/${item.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <FileTextOutlined style={{ fontSize: 18 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Typography.Text ellipsis strong style={{ fontSize: 14 }}>
                      {item.title || '未命名档案'}
                    </Typography.Text>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.category_name && <Tag color="volcano">{item.category_name}</Tag>}
                      {item.doc_no && <Tag>{item.doc_no}</Tag>}
                    </div>
                    <Typography.Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 12, marginTop: 6 }}
                      type="secondary"
                    >
                      {item.ai_guide || item.responsible_party || '暂无摘要'}
                    </Typography.Paragraph>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Spin>

      <div className="flex justify-end">
        <Pagination
          current={page}
          disabled={loading}
          pageSize={PAGE_SIZE}
          showSizeChanger={false}
          total={total}
          onChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
});

export default EmrArchiveList;
