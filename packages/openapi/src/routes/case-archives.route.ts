import { Hono, type Context, type Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { randomUUID } from 'node:crypto';

import { auth } from '@/auth';

const CaseArchivesRoutes = new Hono();

const CASE_ARCHIVE_SCOPE = 'case';
const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

let pool: Pool | undefined;

interface CaseArchiveRow extends QueryResultRow {
  annex_name: string | null;
  category_code: string | null;
  create_time: string | null;
  dept_name: string | null;
  doc_no: string | null;
  id: number;
  oss_hit_first_path: string | null;
  page_count: number | null;
  process_status: string | null;
  remarks: string | null;
  responsible_party: string | null;
  title: string | null;
  year: string | null;
}

interface CaseArchivePayload {
  annex_name?: string;
  category_code?: string;
  dept_name?: string;
  doc_no?: string;
  oss_hit_first_path?: string;
  page_count?: number;
  remarks?: string;
  responsible_party?: string;
  title?: string;
  year?: string;
}

const requireLobeSessionOrOpenApiAuth = async (c: Context, next: Next) => {
  if (c.get('userId')) return next();

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  c.set('userId', session.user.id);
  c.set('authType', 'better-auth');

  return next();
};

const getDatabaseUrl = () => {
  if (process.env.CASE_ARCHIVE_DATABASE_URL) return process.env.CASE_ARCHIVE_DATABASE_URL;

  const host = process.env.CASE_ARCHIVE_DB_HOST;
  const port = process.env.CASE_ARCHIVE_DB_PORT || '5432';
  const database = process.env.CASE_ARCHIVE_DB_NAME;
  const user = process.env.CASE_ARCHIVE_DB_USER;
  const password = process.env.CASE_ARCHIVE_DB_PASSWORD;

  if (!host || !database || !user || !password) return;

  const params = new URLSearchParams({ sslmode: process.env.CASE_ARCHIVE_DB_SSLMODE || 'disable' });
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?${params}`;
};

const getPool = () => {
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new HTTPException(500, {
      message:
        'Case archive database is not configured. Set CASE_ARCHIVE_DATABASE_URL or CASE_ARCHIVE_DB_*.',
    });
  }

  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: Number(process.env.CASE_ARCHIVE_DB_MAX_POOL || 10),
  });
  pool.on('error', (error) => {
    console.error('[CaseArchivesRoutes] idle database client error:', error);
  });

  return pool;
};

const success = <T>(c: Context, data: T) =>
  c.json({
    code: 200,
    data,
    msg: 'success',
  });

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSize = (value: string | null) => Math.min(toPositiveInt(value, DEFAULT_SIZE), MAX_SIZE);

const trim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const escapeLike = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

const buildFilter = (url: URL) => {
  const where = ['visible = $1', 'scope = $2'];
  const params: unknown[] = ['yes', CASE_ARCHIVE_SCOPE];

  const addLike = (column: string, value: string) => {
    if (!value) return;
    params.push(`%${escapeLike(value)}%`);
    where.push(`${column} ILIKE $${params.length} ESCAPE '\\'`);
  };

  addLike('title', trim(url.searchParams.get('title')));
  addLike('doc_no', trim(url.searchParams.get('doc_no')));
  addLike('year', trim(url.searchParams.get('year')));

  const search = trim(url.searchParams.get('search'));
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const index = params.length;
    where.push(
      `(title ILIKE $${index} ESCAPE '\\' OR doc_no ILIKE $${index} ESCAPE '\\' OR annex_name ILIKE $${index} ESCAPE '\\' OR responsible_party ILIKE $${index} ESCAPE '\\')`,
    );
  }

  return { params, where: where.join(' AND ') };
};

const selectColumns = `
  id,
  title,
  doc_no,
  year,
  page_count,
  responsible_party,
  dept_name,
  remarks,
  category_code,
  annex_name,
  oss_hit_first_path,
  process_status,
  receive_time::text AS create_time
`;

const mapArchive = (row: CaseArchiveRow) => ({
  annex_name: row.annex_name || '',
  category_code: row.category_code || '',
  create_time: row.create_time || '',
  dept_name: row.dept_name || '',
  doc_no: row.doc_no || '',
  id: Number(row.id),
  oss_hit_first_path: row.oss_hit_first_path || '',
  page_count: row.page_count == null ? 0 : Number(row.page_count),
  pdf_url: row.oss_hit_first_path || '',
  process_status: row.process_status || 'pending',
  remarks: row.remarks || '',
  responsible_party: row.responsible_party || '',
  title: row.title || '',
  updated_at: row.create_time || '',
  year: row.year || '',
});

const withClient = async <T>(fn: (client: PoolClient) => Promise<T>) => {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

const parsePayload = async (c: Context) => {
  let payload: CaseArchivePayload;
  try {
    payload = (await c.req.json()) as CaseArchivePayload;
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }

  const title = trim(payload.title);
  if (!title) throw new HTTPException(400, { message: '档案标题不能为空' });

  const pageCount = Number(payload.page_count || 0);
  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    throw new HTTPException(400, { message: '页数格式错误' });
  }

  return {
    annex_name: trim(payload.annex_name),
    category_code: trim(payload.category_code),
    dept_name: trim(payload.dept_name),
    doc_no: trim(payload.doc_no),
    oss_hit_first_path: trim(payload.oss_hit_first_path),
    page_count: pageCount,
    remarks: trim(payload.remarks),
    responsible_party: trim(payload.responsible_party),
    title,
    year: trim(payload.year),
  };
};

CaseArchivesRoutes.use('*', requireLobeSessionOrOpenApiAuth);

CaseArchivesRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;
  const filter = buildFilter(url);

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM file_archive WHERE ${filter.where}`,
      filter.params,
    );

    const rowsResult = await client.query<CaseArchiveRow>(
      `SELECT ${selectColumns}
       FROM file_archive
       WHERE ${filter.where}
       ORDER BY receive_time DESC NULLS LAST, id DESC
       LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}`,
      [...filter.params, size, offset],
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

CaseArchivesRoutes.get('/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const archive = await withClient(async (client) => {
    const result = await client.query<CaseArchiveRow>(
      `SELECT ${selectColumns}
       FROM file_archive
       WHERE id = $1 AND visible = $2 AND scope = $3
       LIMIT 1`,
      [id, 'yes', CASE_ARCHIVE_SCOPE],
    );
    return result.rows[0] ? mapArchive(result.rows[0]) : undefined;
  });

  if (!archive) throw new HTTPException(404, { message: '案卷不存在' });
  return success(c, archive);
});

interface CasePageRow extends QueryResultRow {
  id: number;
  page_num: number | null;
  file_name: string | null;
  parse_status: string | null;
  parse_result: string | null;
}

CaseArchivesRoutes.get('/:id/pages', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = Math.min(toPositiveInt(url.searchParams.get('size'), 10), 50);
  const offset = (page - 1) * size;

  const data = await withClient(async (client) => {
    const exists = await client.query(
      `SELECT 1 FROM file_archive WHERE id = $1 AND visible = $2 AND scope = $3`,
      [id, 'yes', CASE_ARCHIVE_SCOPE],
    );
    if (!exists.rowCount) return undefined;

    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM archive_page_image WHERE archive_id = $1`,
      [id],
    );

    const rowsResult = await client.query<CasePageRow>(
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

  if (!data) throw new HTTPException(404, { message: '案卷不存在' });
  return success(c, data);
});

CaseArchivesRoutes.post('/', async (c) => {
  const payload = await parsePayload(c);

  const archive = await withClient(async (client) => {
    const result = await client.query<CaseArchiveRow>(
      `INSERT INTO file_archive (
         archive_unique_id,
         title,
         doc_no,
         year,
         page_count,
         responsible_party,
         dept_name,
         remarks,
         category_code,
         annex_name,
         oss_hit_first_path,
         scope,
         box,
         visible,
         process_status,
         study_status,
         pdf_split_status,
         extract_status,
         pdf_full_text_ocr_parse_status,
         environmental_extract_status,
         receive_time
       )
       VALUES (
         $12,
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, 'green', 'yes', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
         NOW()::text
       )
       RETURNING ${selectColumns}`,
      [
        payload.title,
        payload.doc_no,
        payload.year,
        payload.page_count,
        payload.responsible_party,
        payload.dept_name,
        payload.remarks,
        payload.category_code,
        payload.annex_name,
        payload.oss_hit_first_path,
        CASE_ARCHIVE_SCOPE,
        randomUUID(),
      ],
    );
    return mapArchive(result.rows[0]);
  });

  return success(c, archive);
});

CaseArchivesRoutes.put('/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const payload = await parsePayload(c);

  const archive = await withClient(async (client) => {
    const result = await client.query<CaseArchiveRow>(
      `UPDATE file_archive
       SET title = $1,
           doc_no = $2,
           year = $3,
           page_count = $4,
           responsible_party = $5,
           dept_name = $6,
           remarks = $7,
           category_code = $8,
           annex_name = $9,
           oss_hit_first_path = $10
       WHERE id = $11 AND visible = $12 AND scope = $13
       RETURNING ${selectColumns}`,
      [
        payload.title,
        payload.doc_no,
        payload.year,
        payload.page_count,
        payload.responsible_party,
        payload.dept_name,
        payload.remarks,
        payload.category_code,
        payload.annex_name,
        payload.oss_hit_first_path,
        id,
        'yes',
        CASE_ARCHIVE_SCOPE,
      ],
    );
    return result.rows[0] ? mapArchive(result.rows[0]) : undefined;
  });

  if (!archive) throw new HTTPException(404, { message: '案卷不存在' });
  return success(c, archive);
});

CaseArchivesRoutes.delete('/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const deleted = await withClient(async (client) => {
    const result = await client.query(
      `UPDATE file_archive
       SET visible = $1
       WHERE id = $2 AND visible = $3 AND scope = $4`,
      ['no', id, 'yes', CASE_ARCHIVE_SCOPE],
    );
    return (result.rowCount || 0) > 0;
  });

  if (!deleted) throw new HTTPException(404, { message: '案卷不存在' });
  return success(c, null);
});

CaseArchivesRoutes.post('/upload', () => {
  throw new HTTPException(501, {
    message: '案卷上传处理依赖旧系统 OSS/OCR 任务链路，尚未迁移到 LobeHub 自有后端。',
  });
});

CaseArchivesRoutes.post('/:id/retry-process', () => {
  throw new HTTPException(501, {
    message: '案卷重试处理依赖旧系统 OSS/OCR/知识库任务链路，尚未迁移到 LobeHub 自有后端。',
  });
});

export default CaseArchivesRoutes;
