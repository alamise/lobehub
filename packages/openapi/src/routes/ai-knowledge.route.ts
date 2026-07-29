import { Hono, type Context } from 'hono';
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

const AiKnowledgeRoutes = new Hono();

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const DEPT_SCOPE = 'dept';
const CATEGORY_PREFIX = '03';

interface KnowledgeRow extends QueryResultRow {
  id: number;
  title: string | null;
  doc_no: string | null;
  year: string | null;
  page_count: number | null;
  category_code: string | null;
  category_name: string | null;
  ai_guide: string | null;
  responsible_party: string | null;
  dept_name: string | null;
  process_status: string | null;
}

const mapRow = (row: KnowledgeRow) => ({
  ai_guide: row.ai_guide || '',
  category_code: row.category_code || '',
  category_name: row.category_name || '',
  dept_name: row.dept_name || '',
  doc_no: row.doc_no || '',
  id: Number(row.id),
  page_count: row.page_count == null ? 0 : Number(row.page_count),
  process_status: row.process_status || '',
  responsible_party: row.responsible_party || '',
  title: row.title || '',
  year: row.year || '',
});

AiKnowledgeRoutes.use('*', requireLobeSession);

// ---------------------------------------------------------------------------
// Department knowledge archive list (scope = 'dept', category prefix = '03')
// ---------------------------------------------------------------------------

const ALLOWED_SORT = new Set([
  'id',
  'title',
  'doc_no',
  'year',
  'page_count',
  'environmental_extract_status',
]);

AiKnowledgeRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;

  const sort = url.searchParams.get('sort') || 'id';
  const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sortCol = ALLOWED_SORT.has(sort) ? sort : 'id';

  const params: unknown[] = [DEPT_SCOPE, CATEGORY_PREFIX];
  const where: string[] = [
    'fa.visible = $1',
    "fa.scope = 'dept'",
    `fa.category_code LIKE $${params.length} ESCAPE '\\'`,
  ];

  const search = url.searchParams.get('search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    where.push(`(fa.title ILIKE $${params.length} ESCAPE '\\' OR fa.doc_no ILIKE $${params.length} ESCAPE '\\')`);
  }
  const title = url.searchParams.get('title');
  if (title) {
    params.push(`%${escapeLike(title)}%`);
    where.push(`fa.title ILIKE $${params.length} ESCAPE '\\'`);
  }
  const docNo = url.searchParams.get('doc_no');
  if (docNo) {
    params.push(`%${escapeLike(docNo)}%`);
    where.push(`fa.doc_no ILIKE $${params.length} ESCAPE '\\'`);
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
  const responsible = url.searchParams.get('responsible_party');
  if (responsible) {
    params.push(`%${escapeLike(responsible)}%`);
    where.push(
      `(fa.responsible_party ILIKE $${params.length} ESCAPE '\\' OR fa.dept_name ILIKE $${params.length} ESCAPE '\\')`,
    );
  }

  const extraWhere = where.length ? `AND ${where.join(' AND ')}` : '';

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE ${where.join(' AND ')}`,
      params,
    );

    const rowsResult = await client.query<KnowledgeRow>(
      `SELECT fa.id, fa.title, fa.doc_no, fa.year, fa.page_count,
              fa.category_code, ac.name AS category_name, fa.ai_guide,
              fa.responsible_party, fa.dept_name, fa.process_status
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE ${where.join(' AND ')}
       ORDER BY fa.${sortCol} ${order} NULLS LAST, fa.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );

    return {
      list: rowsResult.rows.map(mapRow),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

// ---------------------------------------------------------------------------
// Category dropdown (only categories under the '03' prefix)
// ---------------------------------------------------------------------------

AiKnowledgeRoutes.get('/categories', async (c) => {
  const data = await withClient(async (client) => {
    const result = await client.query<{ code: string; name: string; description: string | null }>(
      `SELECT code, name, description FROM archive_category
       WHERE code LIKE $1 ESCAPE '\\' ORDER BY code`,
      [`${CATEGORY_PREFIX}%`],
    );
    return result.rows.map((r) => ({ code: r.code, description: r.description || '', name: r.name }));
  });
  return success(c, data);
});

export default AiKnowledgeRoutes;
