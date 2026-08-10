import type { Context } from 'hono';
import { Hono } from 'hono';
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

const AiArchiveRoutes = new Hono();

const ARCHIVE_SCOPE = 'ent';
const EMR_SCOPE = 'emr';
// 应急档案与 AI 档案同表（file_archive），仅 scope 不同。放开详情/分页/图片接口的
// scope 过滤以同时命中 'ent' 与 'emr'，使未改动的 AI 档案详情页可按 id 复用打开应急档案。
// 注意：列表接口（GET /）仍仅限 ARCHIVE_SCOPE，应急档案不会混入 AI 档案列表。
const ARCHIVE_SCOPE_VALUES = [ARCHIVE_SCOPE, EMR_SCOPE];
const DEFAULT_PAGE = 1;
const DOWNLOAD_LINK_TTL_SECONDS = 300;

const buildArchivePageAssetUrl = (
  archiveId: number,
  pageNum: number,
  type: 'image' | 'thumbnail',
) => {
  if (!archiveId || !pageNum) return '';
  const endpoint = type === 'thumbnail' ? 'thumbnail?w=300' : 'image';
  return `/api/v1/ai-archive/${archiveId}/pages/${pageNum}/${endpoint}`;
};

interface ArchiveRow extends QueryResultRow {
  ai_guide: string | null;
  category_code: string | null;
  category_name: string | null;
  company_id: number | null;
  create_time: string | null;
  dept_name: string | null;
  doc_no: string | null;
  extracted_title: string | null;
  id: number;
  page_count: number | null;
  process_status: string | null;
  responsible_party: string | null;
  title: string | null;
  title_from_llm: string | null;
  title_in_excel: string | null;
  year: string | null;
}

const SORT_WHITELIST = [
  'id',
  'title',
  'doc_no',
  'year',
  'page_count',
  'environmental_extract_status',
];

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
  fa.title_from_llm,
  fa.title_in_excel,
  fa.extracted_title,
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
  extracted_title: row.extracted_title || '',
  id: Number(row.id),
  page_count: row.page_count == null ? 0 : Number(row.page_count),
  process_status: row.process_status || 'pending',
  responsible_party: row.responsible_party || '',
  title: row.title || row.title_from_llm || row.title_in_excel || row.extracted_title || '',
  title_from_llm: row.title_from_llm || '',
  title_in_excel: row.title_in_excel || '',
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

  const addTitleLike = (value: string | null) => {
    if (!value) return;
    params.push(`%${escapeLike(value)}%`);
    const idx = params.length;
    where.push(
      `(fa.title ILIKE $${idx} ESCAPE '\\' OR fa.title_from_llm ILIKE $${idx} ESCAPE '\\' OR fa.title_in_excel ILIKE $${idx} ESCAPE '\\' OR fa.extracted_title ILIKE $${idx} ESCAPE '\\')`,
    );
  };

  addTitleLike(url.searchParams.get('title'));
  addLike('fa.doc_no', url.searchParams.get('doc_no'));
  addLike('fa.responsible_party', url.searchParams.get('responsible_party'));

  const search = url.searchParams.get('search');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const idx = params.length;
    where.push(
      `(fa.title ILIKE $${idx} ESCAPE '\\' OR fa.title_from_llm ILIKE $${idx} ESCAPE '\\' OR fa.title_in_excel ILIKE $${idx} ESCAPE '\\' OR fa.extracted_title ILIKE $${idx} ESCAPE '\\' OR fa.doc_no ILIKE $${idx} ESCAPE '\\' OR fa.responsible_party ILIKE $${idx} ESCAPE '\\')`,
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
      `SELECT ${selectColumns}
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE fa.visible = $1 AND fa.scope = ANY($2::text[]) AND fa.id = $3`,
      ['yes', ARCHIVE_SCOPE_VALUES, id],
    );
    return result.rows[0] ? mapArchive(result.rows[0]) : undefined;
  });

  if (!archive) throw new HTTPException(404, { message: '档案不存在' });
  return success(c, archive);
});

// ---------------------------------------------------------------------------
// 原始档案文件（PDF）下载：对齐旧版 Go download_handler.go
// file_archive.oss_hit_first_path → OSS 签名 URL → 服务端流式中转
// ---------------------------------------------------------------------------

interface ArchiveFileRow extends QueryResultRow {
  annex_name: string | null;
  oss_hit_first_path: string | null;
  title: string | null;
}

const getArchiveFile = async (archiveId: number) =>
  withClient(async (client) => {
    const result = await client.query<ArchiveFileRow>(
      `SELECT fa.oss_hit_first_path, fa.annex_name, fa.title
       FROM file_archive fa
       WHERE fa.id = $1 AND fa.visible = $2 AND fa.scope = ANY($3::text[])
       LIMIT 1`,
      [archiveId, 'yes', ARCHIVE_SCOPE_VALUES],
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

AiArchiveRoutes.get('/:id/download-link', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const { fileName } = await getArchiveFile(id);

  return success(c, {
    expire_at: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS,
    file_name: fileName,
    url: `/api/v1/ai-archive/${id}/download`,
  });
});

AiArchiveRoutes.get('/:id/download', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const { fileName, ossPath } = await getArchiveFile(id);
  return createArchiveFileResponse(ossPath, fileName);
});

interface ArchivePageRow extends QueryResultRow {
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

const getArchivePageOssPath = async (archiveId: number, pageNum: number) =>
  withClient(async (client) => {
    const result = await client.query<{ oss_path: string | null }>(
      `SELECT api.oss_path
       FROM archive_page_image api
       INNER JOIN file_archive fa ON fa.id = api.archive_id
       WHERE api.archive_id = $1
         AND api.page_num = $2
         AND fa.visible = $3
         AND fa.scope = ANY($4::text[])
       LIMIT 1`,
      [archiveId, pageNum, 'yes', ARCHIVE_SCOPE_VALUES],
    );
    return result.rows[0]?.oss_path || '';
  });

const serveArchivePageAsset = async (c: Context, type: 'image' | 'thumbnail') => {
  const id = toPositiveInt(c.req.param('id') ?? null, 0);
  const pageNum = toPositiveInt(c.req.param('pageNum') ?? null, 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });
  if (!pageNum) throw new HTTPException(400, { message: 'Invalid page num' });

  const ossPath = await getArchivePageOssPath(id, pageNum);
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

AiArchiveRoutes.get('/:id/pages/:pageNum/image', async (c) => serveArchivePageAsset(c, 'image'));

AiArchiveRoutes.get('/:id/pages/:pageNum/thumbnail', async (c) =>
  serveArchivePageAsset(c, 'thumbnail'),
);

AiArchiveRoutes.get('/:id/pages', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid archive id' });

  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = Math.min(toPositiveInt(url.searchParams.get('size'), 10), 500);
  const offset = (page - 1) * size;

  const data = await withClient(async (client) => {
    const exists = await client.query(
      `SELECT 1 FROM file_archive WHERE id = $1 AND visible = $2 AND scope = ANY($3::text[])`,
      [id, 'yes', ARCHIVE_SCOPE_VALUES],
    );
    if (!exists.rowCount) return undefined;

    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM archive_page_image WHERE archive_id = $1`,
      [id],
    );

    const rowsResult = await client.query<ArchivePageRow>(
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
          image_url: ossPath ? buildArchivePageAssetUrl(id, pageNum, 'image') : '',
          oss_path: ossPath,
          page_num: pageNum,
          parse_error: row.parse_error || '',
          parse_result: row.parse_result || '',
          parse_status: row.parse_status || 'pending',
          thumbnail_url: ossPath ? buildArchivePageAssetUrl(id, pageNum, 'thumbnail') : '',
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

export default AiArchiveRoutes;
