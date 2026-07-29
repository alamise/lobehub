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

const AiArchiveRoutes = new Hono();

const ARCHIVE_SCOPE = 'ent';
const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;

interface ArchiveRow extends QueryResultRow {
  id: number;
  title: string | null;
  doc_no: string | null;
  year: string | null;
  page_count: number | null;
  category_code: string | null;
  category_name: string | null;
  company_id: number | null;
  responsible_party: string | null;
  dept_name: string | null;
  process_status: string | null;
  ai_guide: string | null;
  create_time: string | null;
}

const SORT_WHITELIST = ['id', 'title', 'doc_no', 'year', 'page_count', 'environmental_extract_status'];

/**
 * 与旧版 Go 服务 buildEnvironmentalExtractStatusOrderClause 完全一致的复合排序：
 * 有标题优先 → 文号含“环评批复”优先 → 提取状态升序 → 页数降序 → id 降序。
 * 旧版实现同样忽略 order 方向参数。
 */
const ENVIRONMENTAL_EXTRACT_ORDER = `
  CASE WHEN fa.title IS NULL OR TRIM(fa.title) = '' THEN 0 ELSE 1 END DESC,
  CASE WHEN fa.doc_no LIKE '%环评批复%' THEN 1 ELSE 0 END DESC,
  fa.environmental_extract_status ASC,
  COALESCE(fa.page_count, 0) DESC,
  fa.id DESC
`;

const buildOrderClause = (sortColumn: string, order: 'ASC' | 'DESC') =>
  sortColumn === 'environmental_extract_status'
    ? ENVIRONMENTAL_EXTRACT_ORDER
    : `fa.${sortColumn} ${order} NULLS LAST, fa.id DESC`;

const selectColumns = `
  fa.id,
  fa.title,
  fa.doc_no,
  fa.year,
  fa.page_count,
  fa.category_code,
  ac.name AS category_name,
  fa.company_id,
  fa.responsible_party,
  fa.dept_name,
  fa.process_status,
  fa.ai_guide,
  fa.receive_time::text AS create_time
`;

const fromClause = `
  FROM file_archive fa
  LEFT JOIN archive_category ac ON fa.category_code = ac.code
  WHERE fa.visible = $1 AND fa.scope = $2
`;

const mapArchive = (row: ArchiveRow) => ({
  ai_guide: row.ai_guide || '',
  category_code: row.category_code || '',
  category_name: row.category_name || '',
  company_id: row.company_id == null ? null : Number(row.company_id),
  create_time: row.create_time || '',
  dept_name: row.dept_name || '',
  doc_no: row.doc_no || '',
  id: Number(row.id),
  page_count: row.page_count == null ? 0 : Number(row.page_count),
  process_status: row.process_status || 'pending',
  responsible_party: row.responsible_party || '',
  title: row.title || '',
  year: row.year || '',
});

AiArchiveRoutes.use('*', requireLobeSession);

AiArchiveRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;

  const sort = url.searchParams.get('sort') || 'id';
  const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sortColumn = SORT_WHITELIST.includes(sort) ? sort : 'id';

  const params: unknown[] = ['yes', ARCHIVE_SCOPE];
  const where: string[] = [];

  const addLike = (column: string, value: string | null) => {
    if (!value) return;
    params.push(`%${escapeLike(value)}%`);
    where.push(`${column} ILIKE $${params.length} ESCAPE '\\'`);
  };

  addLike('fa.title', url.searchParams.get('title'));
  addLike('fa.doc_no', url.searchParams.get('doc_no'));
  addLike('fa.responsible_party', url.searchParams.get('responsible_party'));

  const search = url.searchParams.get('search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const idx = params.length;
    where.push(
      `(fa.title ILIKE $${idx} ESCAPE '\\' OR fa.doc_no ILIKE $${idx} ESCAPE '\\' OR fa.responsible_party ILIKE $${idx} ESCAPE '\\')`,
    );
  }

  const year = url.searchParams.get('year');
  if (year) {
    params.push(year);
    where.push(`fa.year = $${params.length}`);
  }

  const categoryCode = url.searchParams.get('category_code');
  if (categoryCode) {
    params.push(categoryCode);
    where.push(`fa.category_code = $${params.length}`);
  }

  const categoryPrefix = url.searchParams.get('category_prefix');
  if (categoryPrefix) {
    params.push(`${escapeLike(categoryPrefix)}%`);
    where.push(`fa.category_code LIKE $${params.length} ESCAPE '\\'`);
  }

  const extraWhere = where.length ? `AND ${where.join(' AND ')}` : '';

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${fromClause} ${extraWhere}`,
      params,
    );

    const rowsResult = await client.query<ArchiveRow>(
      `SELECT ${selectColumns} ${fromClause} ${extraWhere}
       ORDER BY ${buildOrderClause(sortColumn, order)}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );

    return {
      list: rowsResult.rows.map(mapArchive),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

AiArchiveRoutes.get('/categories', async (c) => {
  const rows = await withClient((client) =>
    client.query<{ code: string; name: string; description: string | null }>(
      `SELECT code, name, description FROM archive_category ORDER BY code`,
    ),
  );
  return success(c, rows.rows);
});

AiArchiveRoutes.get('/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const archive = await withClient(async (client) => {
    const result = await client.query<ArchiveRow>(
      `SELECT ${selectColumns} ${fromClause} AND fa.id = $3`,
      ['yes', ARCHIVE_SCOPE, id],
    );
    return result.rows[0] ? mapArchive(result.rows[0]) : undefined;
  });

  if (!archive) throw new HTTPException(404, { message: '档案不存在' });
  return success(c, archive);
});

interface ArchivePageRow extends QueryResultRow {
  id: number;
  page_num: number | null;
  file_name: string | null;
  parse_status: string | null;
  parse_result: string | null;
}

AiArchiveRoutes.get('/:id/pages', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = Math.min(toPositiveInt(url.searchParams.get('size'), 10), 50);
  const offset = (page - 1) * size;

  const data = await withClient(async (client) => {
    const exists = await client.query(
      `SELECT 1 FROM file_archive WHERE id = $1 AND visible = $2 AND scope = $3`,
      [id, 'yes', ARCHIVE_SCOPE],
    );
    if (!exists.rowCount) return undefined;

    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM archive_page_image WHERE archive_id = $1`,
      [id],
    );

    const rowsResult = await client.query<ArchivePageRow>(
      `SELECT id, page_num, file_name, parse_status, parse_result
       FROM archive_page_image
       WHERE archive_id = $1
       ORDER BY page_num ASC NULLS LAST, id ASC
       LIMIT $2 OFFSET $3`,
      [id, size, offset],
    );

    return {
      list: rowsResult.rows.map((row) => ({
        content: row.parse_result || '',
        file_name: row.file_name || '',
        id: Number(row.id),
        page_num: row.page_num == null ? 0 : Number(row.page_num),
        parse_status: row.parse_status || 'pending',
      })),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  if (!data) throw new HTTPException(404, { message: '档案不存在' });
  return success(c, data);
});

export default AiArchiveRoutes;
