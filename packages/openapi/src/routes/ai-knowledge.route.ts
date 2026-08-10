import { type Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { QueryResultRow } from 'pg';

import {
  buildArchiveDownloadFileName,
  buildOssObjectUrl,
  createArchiveFileResponse,
  getImageContentType,
  IMAGE_CACHE_MAX_AGE,
} from './archiveOss';
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
const DEPT_SCOPE = 'dept';
const CATEGORY_PREFIX = '03';
const DOWNLOAD_LINK_TTL_SECONDS = 300;

interface KnowledgeRow extends QueryResultRow {
  ai_guide: string | null;
  category_code: string | null;
  category_name: string | null;
  dept_name: string | null;
  doc_no: string | null;
  id: number;
  page_count: number | null;
  process_status: string | null;
  responsible_party: string | null;
  title: string | null;
  year: string | null;
}

interface KnowledgePageRow extends QueryResultRow {
  dpi: number | null;
  file_name: string | null;
  governed_parse_result: string | null;
  id: number;
  oss_path: string | null;
  page_num: number | null;
  parse_error: string | null;
  parse_result: string | null;
  parse_status: string | null;
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

const buildKnowledgePageAssetUrl = (
  archiveId: number,
  pageNum: number,
  type: 'image' | 'thumbnail',
) => {
  if (!archiveId || !pageNum) return '';
  const endpoint = type === 'thumbnail' ? 'thumbnail?w=300' : 'image';
  return `/api/v1/ai-knowledge/${archiveId}/pages/${pageNum}/${endpoint}`;
};

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

  const params: unknown[] = ['yes', DEPT_SCOPE, `${CATEGORY_PREFIX}%`];
  const where: string[] = [
    'fa.visible = $1',
    'fa.scope = $2',
    `fa.category_code LIKE $${params.length} ESCAPE '\\'`,
  ];

  const search = url.searchParams.get('search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    where.push(
      `(fa.title ILIKE $${params.length} ESCAPE '\\' OR fa.doc_no ILIKE $${params.length} ESCAPE '\\')`,
    );
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
    return result.rows.map((r) => ({
      code: r.code,
      description: r.description || '',
      name: r.name,
    }));
  });
  return success(c, data);
});

AiKnowledgeRoutes.get('/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const archive = await withClient(async (client) => {
    const result = await client.query<KnowledgeRow>(
      `SELECT fa.id, fa.title, fa.doc_no, fa.year, fa.page_count,
              fa.category_code, ac.name AS category_name, fa.ai_guide,
              fa.responsible_party, fa.dept_name, fa.process_status
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE fa.id = $1
         AND fa.visible = $2
         AND fa.scope = $3
         AND fa.category_code LIKE $4 ESCAPE '\\'
       LIMIT 1`,
      [id, 'yes', DEPT_SCOPE, `${CATEGORY_PREFIX}%`],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : undefined;
  });

  if (!archive) throw new HTTPException(404, { message: '档案不存在' });
  return success(c, archive);
});

// ---------------------------------------------------------------------------
// 原始文档（PDF）下载：与 AI 档案一致，取 file_archive.oss_hit_first_path
// ---------------------------------------------------------------------------

interface KnowledgeFileRow extends QueryResultRow {
  annex_name: string | null;
  oss_hit_first_path: string | null;
  title: string | null;
}

const getKnowledgeFile = async (archiveId: number) =>
  withClient(async (client) => {
    const result = await client.query<KnowledgeFileRow>(
      `SELECT fa.oss_hit_first_path, fa.annex_name, fa.title
       FROM file_archive fa
       WHERE fa.id = $1
         AND fa.visible = $2
         AND fa.scope = $3
         AND fa.category_code LIKE $4 ESCAPE '\\'
       LIMIT 1`,
      [archiveId, 'yes', DEPT_SCOPE, `${CATEGORY_PREFIX}%`],
    );

    const row = result.rows[0];
    if (!row) throw new HTTPException(404, { message: '档案不存在' });

    const ossPath = (row.oss_hit_first_path || '').trim();
    if (!ossPath) throw new HTTPException(404, { message: '档案原件不存在' });

    return {
      fileName: buildArchiveDownloadFileName({
        annexName: row.annex_name,
        id: archiveId,
        ossPath,
        title: row.title,
      }),
      ossPath,
    };
  });

AiKnowledgeRoutes.get('/:id/download-link', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const { fileName } = await getKnowledgeFile(id);

  return success(c, {
    expire_at: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS,
    file_name: fileName,
    url: `/api/v1/ai-knowledge/${id}/download`,
  });
});

AiKnowledgeRoutes.get('/:id/download', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const { fileName, ossPath } = await getKnowledgeFile(id);
  return createArchiveFileResponse(ossPath, fileName);
});

const getKnowledgePageOssPath = async (archiveId: number, pageNum: number) =>
  withClient(async (client) => {
    const result = await client.query<{ oss_path: string | null }>(
      `SELECT api.oss_path
       FROM archive_page_image api
       INNER JOIN file_archive fa ON fa.id = api.archive_id
       WHERE api.archive_id = $1
         AND api.page_num = $2
         AND fa.visible = $3
         AND fa.scope = $4
         AND fa.category_code LIKE $5 ESCAPE '\\'
       LIMIT 1`,
      [archiveId, pageNum, 'yes', DEPT_SCOPE, `${CATEGORY_PREFIX}%`],
    );
    return result.rows[0]?.oss_path || '';
  });

const serveKnowledgePageAsset = async (c: Context, type: 'image' | 'thumbnail') => {
  const id = toPositiveInt(c.req.param('id') ?? null, 0);
  const pageNum = toPositiveInt(c.req.param('pageNum') ?? null, 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });
  if (!pageNum) throw new HTTPException(400, { message: 'Invalid page num' });

  const ossPath = await getKnowledgePageOssPath(id, pageNum);
  if (!ossPath) throw new HTTPException(404, { message: '图片不存在' });

  const sourceUrl = buildOssObjectUrl(ossPath, type);
  if (!sourceUrl) throw new HTTPException(400, { message: '无效的图片路径' });

  const upstream = await fetch(sourceUrl);
  if (!upstream.ok) throw new HTTPException(502, { message: '获取图片失败' });

  const body = await upstream.arrayBuffer();
  const contentType = getImageContentType(ossPath, upstream.headers.get('content-type'));

  return new Response(body, {
    headers: {
      'Cache-Control': `public, max-age=${IMAGE_CACHE_MAX_AGE}`,
      'Content-Disposition': 'inline',
      'Content-Length': String(body.byteLength),
      'Content-Type': contentType,
    },
  });
};

AiKnowledgeRoutes.get('/:id/pages/:pageNum/image', async (c) =>
  serveKnowledgePageAsset(c, 'image'),
);

AiKnowledgeRoutes.get('/:id/pages/:pageNum/thumbnail', async (c) =>
  serveKnowledgePageAsset(c, 'thumbnail'),
);

AiKnowledgeRoutes.get('/:id/pages', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = Math.min(toPositiveInt(url.searchParams.get('size'), 10), 500);
  const offset = (page - 1) * size;

  const data = await withClient(async (client) => {
    const exists = await client.query(
      `SELECT 1
       FROM file_archive
       WHERE id = $1
         AND visible = $2
         AND scope = $3
         AND category_code LIKE $4 ESCAPE '\\'`,
      [id, 'yes', DEPT_SCOPE, `${CATEGORY_PREFIX}%`],
    );
    if (!exists.rowCount) return undefined;

    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM archive_page_image WHERE archive_id = $1`,
      [id],
    );

    const rowsResult = await client.query<KnowledgePageRow>(
      `SELECT id, page_num, file_name, oss_path, dpi,
              parse_status, parse_result, governed_parse_result, parse_error
       FROM archive_page_image
       WHERE archive_id = $1
       ORDER BY page_num ASC NULLS LAST, id ASC
       LIMIT $2 OFFSET $3`,
      [id, size, offset],
    );

    return {
      list: rowsResult.rows.map((row) => {
        const ossPath = row.oss_path || '';
        const pageNum = row.page_num == null ? 0 : Number(row.page_num);

        return {
          content: row.parse_result || '',
          dpi: row.dpi == null ? 0 : Number(row.dpi),
          file_name: row.file_name || '',
          governed_parse_result: row.governed_parse_result || '',
          id: Number(row.id),
          image_url: ossPath ? buildKnowledgePageAssetUrl(id, pageNum, 'image') : '',
          oss_path: ossPath,
          page_num: pageNum,
          parse_error: row.parse_error || '',
          parse_result: row.parse_result || '',
          parse_status: row.parse_status || 'pending',
          thumbnail_url: ossPath ? buildKnowledgePageAssetUrl(id, pageNum, 'thumbnail') : '',
        };
      }),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  if (!data) throw new HTTPException(404, { message: '档案不存在' });
  return success(c, data);
});

export default AiKnowledgeRoutes;
