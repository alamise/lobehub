'use client';

import { Collapse, Empty, Pagination, Spin, Tag, Typography, message } from 'antd';
import { memo, useCallback, useEffect, useState } from 'react';

import { useUrlPage } from '@/hooks/useUrlPage';

export interface BrowsePageItem {
  content: string;
  file_name: string;
  id: number;
  page_num: number;
  parse_status: string;
}

interface PagesBrowserProps {
  fetchPages: (page: number, size: number) => Promise<{ list: BrowsePageItem[]; total: number }>;
  emptyDescription?: string;
  errorDescription?: string;
  /**
   * URL 中记录内页页码的参数名（与列表页的 page 区分开）
   */
  urlKey?: string;
}

const PAGE_SIZE = 10;

const StatusTag = ({ status }: { status: string }) => {
  if (status === 'completed') return <Tag color="success">已解析</Tag>;
  if (status === 'failed') return <Tag color="error">解析失败</Tag>;
  if (status === 'processing') return <Tag color="processing">解析中</Tag>;
  return <Tag color="default">待解析</Tag>;
};

/**
 * 档案页内容浏览器：分页浏览 archive_page_image 的 OCR 解析文本。
 */
const PagesBrowser = memo<PagesBrowserProps>(
  (
    { emptyDescription = '该档案暂无页级解析数据', errorDescription = '档案页内容加载失败', fetchPages, urlKey = 'doc_page' },
  ) => {
    const [page, setPage] = useUrlPage(urlKey);
    const [total, setTotal] = useState(0);
    const [items, setItems] = useState<BrowsePageItem[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const result = await fetchPages(page, PAGE_SIZE);
        setItems(result.list || []);
        setTotal(result.total || 0);
      } catch (error) {
        setItems([]);
        setTotal(0);
        message.error(error instanceof Error ? error.message : errorDescription);
      } finally {
        setLoading(false);
      }
    }, [errorDescription, fetchPages, page]);

    useEffect(() => {
      void load();
    }, [load]);

    if (loading && items.length === 0) {
      return (
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin />
        </div>
      );
    }

    if (!loading && total === 0) {
      return <Empty description={emptyDescription} />;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Spin spinning={loading}>
          <Collapse
            items={items.map((item) => ({
              children: item.content ? (
                <Typography.Paragraph
                  style={{ marginBottom: 0, maxHeight: 420, overflowY: 'auto', whiteSpace: 'pre-wrap' }}
                >
                  {item.content}
                </Typography.Paragraph>
              ) : (
                <Typography.Text type="secondary">该页暂无解析文本</Typography.Text>
              ),
              extra: <StatusTag status={item.parse_status} />,
              key: item.id,
              label: (
                <span>
                  第 {item.page_num} 页
                  {item.file_name ? (
                    <Typography.Text style={{ marginLeft: 8 }} type="secondary">
                      {item.file_name}
                    </Typography.Text>
                  ) : null}
                </span>
              ),
            }))}
          />
        </Spin>
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <Typography.Text type="secondary">共 {total} 页</Typography.Text>
          <Pagination
            current={page}
            disabled={loading}
            onChange={setPage}
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            total={total}
          />
        </div>
      </div>
    );
  },
);

PagesBrowser.displayName = 'PagesBrowser';

export default PagesBrowser;
