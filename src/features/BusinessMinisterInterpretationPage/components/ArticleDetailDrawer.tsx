'use client';

import { Drawer, Empty, Spin, Typography } from 'antd';
import { BankOutlined, ClockCircleOutlined, ExportOutlined } from '@ant-design/icons';
import { memo } from 'react';

import type { ArticleItem } from '../api';

interface ArticleDetailDrawerProps {
  article: ArticleItem | null;
  loading?: boolean;
  onClose?: () => void;
  open?: boolean;
}

const paragraphs = (content: string) =>
  content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const ArticleDetailDrawer = memo<ArticleDetailDrawerProps>(
  ({ article, loading, onClose, open }) => (
    <Drawer width={640} open={open} onClose={onClose} title={article?.title || '文章详情'}>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spin />
        </div>
      ) : !article ? (
        <Empty description="暂无数据" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {article.source_name && (
              <span className="inline-flex items-center gap-1">
                <BankOutlined style={{ fontSize: 14 }} />
                {article.source_name}
              </span>
            )}
            {article.published_at && (
              <span className="inline-flex items-center gap-1">
                <ClockCircleOutlined />
                发布时间：{article.published_at}
              </span>
            )}
          </div>

          {article.source_url && (
            <a
              href={article.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
            >
              <ExportOutlined />
              查看原文
            </a>
          )}

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
            正文字数：{article.content.length} 字
          </div>

          <div className="space-y-3">
            {paragraphs(article.content).map((p, i) => (
              <Typography.Paragraph key={i} className="!mb-0 text-sm leading-relaxed text-slate-700">
                {p}
              </Typography.Paragraph>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  ),
);

ArticleDetailDrawer.displayName = 'MinisterArticleDetailDrawer';

export default ArticleDetailDrawer;

