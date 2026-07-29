'use client';

import { Button, Card, Empty, Typography, message } from 'antd';
import { BankOutlined, ClockCircleOutlined, ExportOutlined, FileTextOutlined } from '@ant-design/icons';
import { memo } from 'react';

import type { ArticleItem } from '../api';

interface ArticleListProps {
  articles: ArticleItem[];
  loading?: boolean;
  onDetail?: (id: number) => void;
}

const preview = (content: string, max = 140) => {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const ArticleList = memo<ArticleListProps>(({ articles, loading, onDetail }) => {
  if (!loading && articles.length === 0) {
    return <Empty description="暂无解读文章" className="py-12" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {articles.map((article) => (
        <Card key={article.id} bordered={false} className="shadow-sm" hoverable>
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <FileTextOutlined style={{ fontSize: 18 }} />
              </div>
              <Typography.Title
                className="!mb-0 !mt-0 cursor-pointer hover:text-sky-600"
                level={5}
                onClick={() => onDetail?.(article.id)}
              >
                {article.title || '（无标题）'}
              </Typography.Title>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              {article.source_name && (
                <span className="inline-flex items-center gap-1">
                  <BankOutlined style={{ fontSize: 13 }} />
                  {article.source_name}
                </span>
              )}
              {article.published_at && (
                <span className="inline-flex items-center gap-1">
                  <ClockCircleOutlined />
                  {article.published_at}
                </span>
              )}
            </div>

            <Typography.Paragraph className="!mb-0 flex-1 text-sm text-slate-600">
              {preview(article.content)}
            </Typography.Paragraph>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              {article.source_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExportOutlined />
                  原文链接
                </a>
              ) : (
                <span />
              )}
              <Button size="small" type="link" onClick={() => onDetail?.(article.id)}>
                查看详情
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
});

ArticleList.displayName = 'MinisterArticleList';

export default ArticleList;
