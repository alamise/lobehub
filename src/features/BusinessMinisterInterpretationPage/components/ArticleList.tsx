'use client';

import {
  BankOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Card, Empty, Typography } from 'antd';
import { memo } from 'react';

import type { ArticleItem } from '../api';

interface ArticleListProps {
  articles: ArticleItem[];
  loading?: boolean;
  onDetail?: (id: number) => void;
}

const preview = (content: string, max = 140) => {
  const text = content.replaceAll(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const ArticleList = memo<ArticleListProps>(({ articles, loading, onDetail }) => {
  if (!loading && articles.length === 0) {
    return <Empty className="py-12" description="暂无解读文章" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {articles.map((article) => (
        <Card
          bordered={false}
          className="cursor-pointer rounded-xl shadow-sm"
          key={article.id}
          onClick={() => onDetail?.(article.id)}
        >
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <FileTextOutlined style={{ fontSize: 18 }} />
              </div>
              <Typography.Title className="!mb-0 !mt-0" level={5}>
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
                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                  href={article.source_url}
                  rel="noreferrer"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExportOutlined />
                  原文链接
                </a>
              ) : (
                <span />
              )}
              <Typography.Link
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetail?.(article.id);
                }}
              >
                查看详情
              </Typography.Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
});

ArticleList.displayName = 'MinisterArticleList';

export default ArticleList;
