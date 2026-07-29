import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { QueryResultRow } from 'pg';

import {
  escapeLike,
  normalizeSize,
  requireLobeSession,
  success,
  toPositiveInt,
  withClient,
} from './legacyDb';

const AiArticlesRoutes = new Hono();

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 10;

interface ArticleRow extends QueryResultRow {
  id: number;
  title: string | null;
  published_at: string | null;
  content: string | null;
  source_url: string | null;
  source_name: string | null;
  crawled_at: string | null;
  es_sync_status: string | null;
  es_sync_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const selectColumns = `
  id,
  title,
  published_at,
  content,
  source_url,
  source_name,
  crawled_at,
  es_sync_status,
  es_sync_error,
  created_at::text AS created_at,
  updated_at::text AS updated_at
`;

const fromClause = `FROM articles`;

const mapArticle = (row: ArticleRow) => ({
  content: row.content || '',
  crawled_at: row.crawled_at || '',
  created_at: row.created_at || '',
  es_sync_error: row.es_sync_error || '',
  es_sync_status: row.es_sync_status || '',
  id: Number(row.id),
  published_at: row.published_at || '',
  source_name: row.source_name || '',
  source_url: row.source_url || '',
  title: row.title || '',
  updated_at: row.updated_at || '',
});

AiArticlesRoutes.use('*', requireLobeSession);

AiArticlesRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;

  const params: unknown[] = [];
  const where: string[] = [];

  const search = url.searchParams.get('search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const idx = params.length;
    where.push(
      `(title ILIKE $${idx} ESCAPE '\\' OR content ILIKE $${idx} ESCAPE '\\' OR source_name ILIKE $${idx} ESCAPE '\\' OR source_url ILIKE $${idx} ESCAPE '\\')`,
    );
  }

  const hasEmbedding = url.searchParams.get('has_embedding');
  if (hasEmbedding === 'true') {
    where.push(`embedding_vector IS NOT NULL`);
  } else if (hasEmbedding === 'false') {
    where.push(`embedding_vector IS NULL`);
  }

  const extraWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${fromClause} ${extraWhere}`,
      params,
    );

    const rowsResult = await client.query<ArticleRow>(
      `SELECT ${selectColumns} ${fromClause} ${extraWhere}
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );

    return {
      list: rowsResult.rows.map(mapArticle),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

AiArticlesRoutes.get('/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid article id' });

  const article = await withClient(async (client) => {
    const result = await client.query<ArticleRow>(
      `SELECT ${selectColumns} ${fromClause} WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapArticle(result.rows[0]) : undefined;
  });

  if (!article) throw new HTTPException(404, { message: '文章不存在' });
  return success(c, article);
});

export default AiArticlesRoutes;
