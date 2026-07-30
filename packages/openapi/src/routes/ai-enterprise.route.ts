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

const AiEnterpriseRoutes = new Hono();

const DEFAULT_PAGE = 1;
const ENTERPRISE_ARCHIVE_SCOPE = 'ent';

interface CompanySummaryRow extends QueryResultRow {
  address: string | null;
  archive_count: string;
  enterprise_no: string | null;
  id: number;
  industry: string | null;
  legal_person: string | null;
  name: string | null;
  phone: string | null;
  region_name: string | null;
}

interface CompanyDetailRow extends QueryResultRow {
  address: string | null;
  archive_count: string;
  business_license: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  create_time: string | null;
  enterprise_no: string | null;
  establish_time: string | null;
  former_name: string | null;
  id: number;
  industry: string | null;
  legal_person: string | null;
  name: string | null;
  phone: string | null;
  region_name: string | null;
  update_time: string | null;
}

interface FactoryRow extends QueryResultRow {
  address: string | null;
  create_time: string | null;
  factory_name: string | null;
  id: number;
  pollutant_type: string | null;
  region_name: string | null;
  run_status: string | null;
  wgs_lat: string | null;
  wgs_lon: string | null;
}

interface UpdateCompanyPayload {
  address?: string;
  business_license?: string;
  contact_name?: string;
  contact_phone?: string;
  enterprise_no?: string;
  former_name?: string;
  industry?: string;
  legal_person?: string;
  name?: string;
  phone?: string;
  region_name?: string;
}

const trimPayloadValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const mapCompanySummary = (row: CompanySummaryRow) => ({
  address: row.address || '',
  archive_count: Number(row.archive_count || 0),
  enterprise_no: row.enterprise_no || '',
  id: Number(row.id),
  industry: row.industry || '',
  legal_person: row.legal_person || '',
  name: row.name || '',
  phone: row.phone || '',
  region_name: row.region_name || '',
});

const mapCompanyDetail = (row: CompanyDetailRow) => ({
  address: row.address || '',
  archive_count: Number(row.archive_count || 0),
  business_license: row.business_license || '',
  contact_name: row.contact_name || '',
  contact_phone: row.contact_phone || '',
  enterprise_no: row.enterprise_no || '',
  establish_time: row.establish_time || '',
  former_name: row.former_name || '',
  id: Number(row.id),
  industry: row.industry || '',
  legal_person: row.legal_person || '',
  name: row.name || '',
  phone: row.phone || '',
  region_name: row.region_name || '',
  create_time: row.create_time || '',
  update_time: row.update_time || '',
});

const mapFactory = (row: FactoryRow) => ({
  address: row.address || '',
  factory_name: row.factory_name || '',
  id: Number(row.id),
  pollutant_type: row.pollutant_type || '',
  region_name: row.region_name || '',
  run_status: row.run_status || '',
  wgs_lat: row.wgs_lat || '',
  wgs_lon: row.wgs_lon || '',
  create_time: row.create_time || '',
});

AiEnterpriseRoutes.use('*', requireLobeSession);

AiEnterpriseRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;
  const search = url.searchParams.get('search');

  const params: unknown[] = [ENTERPRISE_ARCHIVE_SCOPE, 'yes'];
  let searchClause = '';
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    searchClause = `AND e.name ILIKE $${params.length} ESCAPE '\\'`;
  }

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM co_polluter_enterprise e
       JOIN (
         SELECT company_id, COUNT(*) AS cnt FROM file_archive
         WHERE scope = $1 AND visible = $2 GROUP BY company_id
       ) a ON a.company_id = e.id
       WHERE (e.deleted IS NULL OR e.deleted = 0) AND a.cnt > 0 ${searchClause}`,
      params,
    );

    const rowsResult = await client.query<CompanySummaryRow>(
      `SELECT e.id, e.name, e.enterprise_no, e.legal_person, e.phone, e.industry,
              e.region_name, e.address, a.cnt::text AS archive_count
       FROM co_polluter_enterprise e
       JOIN (
         SELECT company_id, COUNT(*) AS cnt FROM file_archive
         WHERE scope = $1 AND visible = $2 GROUP BY company_id
       ) a ON a.company_id = e.id
       WHERE (e.deleted IS NULL OR e.deleted = 0) AND a.cnt > 0 ${searchClause}
       ORDER BY a.cnt DESC NULLS LAST, e.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );

    return {
      list: rowsResult.rows.map(mapCompanySummary),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

AiEnterpriseRoutes.get('/:id/archives', async (c) => {
  const companyId = toPositiveInt(c.req.param('id'), 0);
  if (!companyId) throw new HTTPException(400, { message: 'Invalid company id' });

  const rows = await withClient((client) =>
    client.query<{
      id: number;
      title: string | null;
      doc_no: string | null;
      year: string | null;
      page_count: number | null;
      category_code: string | null;
      category_name: string | null;
      responsible_party: string | null;
      dept_name: string | null;
      process_status: string | null;
      create_time: string | null;
    }>(
      `SELECT fa.id, fa.title, fa.doc_no, fa.year, fa.page_count, fa.category_code,
              ac.name AS category_name,
              fa.responsible_party, fa.dept_name, fa.process_status, fa.receive_time::text AS create_time
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE company_id = $1 AND scope = $2 AND visible = $3
       ORDER BY fa.receive_time DESC NULLS LAST, fa.id DESC`,
      [companyId, ENTERPRISE_ARCHIVE_SCOPE, 'yes'],
    ),
  );

  return success(c, {
    list: rows.rows.map((r) => ({
      category_code: r.category_code || '',
      category_name: r.category_name || '',
      create_time: r.create_time || '',
      dept_name: r.dept_name || '',
      doc_no: r.doc_no || '',
      id: Number(r.id),
      page_count: r.page_count == null ? 0 : Number(r.page_count),
      process_status: r.process_status || 'pending',
      responsible_party: r.responsible_party || '',
      title: r.title || '',
      year: r.year || '',
    })),
  });
});

AiEnterpriseRoutes.get('/:id/guide-questions', async (c) => {
  const companyId = toPositiveInt(c.req.param('id'), 0);
  if (!companyId) throw new HTTPException(400, { message: 'Invalid company id' });

  const rows = await withClient((client) =>
    client.query<{ ai_guide: string | null }>(
      `SELECT ai_guide FROM file_archive
       WHERE company_id = $1 AND scope = $2 AND visible = $3 AND ai_guide IS NOT NULL AND ai_guide <> ''
       LIMIT 10`,
      [companyId, ENTERPRISE_ARCHIVE_SCOPE, 'yes'],
    ),
  );

  const questions = rows.rows
    .map((r) => (r.ai_guide || '').split('\n')[0])
    .filter((q) => q.trim().length > 0)
    .slice(0, 3);

  return success(c, { questions });
});

AiEnterpriseRoutes.put('/:id', async (c) => {
  const companyId = toPositiveInt(c.req.param('id'), 0);
  if (!companyId) throw new HTTPException(400, { message: 'Invalid company id' });

  const payload = (await c.req.json().catch(() => ({}))) as UpdateCompanyPayload;
  const name = trimPayloadValue(payload.name);
  if (!name) throw new HTTPException(400, { message: '企业名称不能为空' });

  const result = await withClient(async (client) => {
    const exists = await client.query(
      `SELECT 1 FROM co_polluter_enterprise WHERE id = $1 AND (deleted IS NULL OR deleted = 0)`,
      [companyId],
    );
    if (!exists.rowCount) return undefined;

    await client.query(
      `UPDATE co_polluter_enterprise
       SET name = $1,
           former_name = $2,
           enterprise_no = $3,
           business_license = $4,
           legal_person = $5,
           contact_name = $6,
           contact_phone = $7,
           phone = $8,
           industry = $9,
           region_name = $10,
           address = $11,
           update_time = NOW()
       WHERE id = $12`,
      [
        name,
        trimPayloadValue(payload.former_name),
        trimPayloadValue(payload.enterprise_no).toUpperCase(),
        trimPayloadValue(payload.business_license).toUpperCase(),
        trimPayloadValue(payload.legal_person),
        trimPayloadValue(payload.contact_name),
        trimPayloadValue(payload.contact_phone),
        trimPayloadValue(payload.phone),
        trimPayloadValue(payload.industry),
        trimPayloadValue(payload.region_name),
        trimPayloadValue(payload.address),
        companyId,
      ],
    );

    return true;
  });

  if (!result) throw new HTTPException(404, { message: '企业不存在' });
  return success(c, null);
});

AiEnterpriseRoutes.get('/:id', async (c) => {
  const companyId = toPositiveInt(c.req.param('id'), 0);
  if (!companyId) throw new HTTPException(400, { message: 'Invalid company id' });

  const result = await withClient(async (client) => {
    const companyResult = await client.query<CompanyDetailRow>(
      `SELECT e.id, e.name, e.former_name, e.enterprise_no, e.legal_person, e.region_name,
              e.address, e.phone, e.contact_name, e.contact_phone, e.industry, e.business_license,
              e.establish_time, e.create_time::text AS create_time, e.update_time::text AS update_time,
              COALESCE(a.cnt, 0)::text AS archive_count
       FROM co_polluter_enterprise e
       LEFT JOIN (
         SELECT company_id, COUNT(*) AS cnt FROM file_archive
         WHERE scope = $1 AND visible = $2 GROUP BY company_id
       ) a ON a.company_id = e.id
       WHERE e.id = $3 AND (e.deleted IS NULL OR e.deleted = 0)`,
      [ENTERPRISE_ARCHIVE_SCOPE, 'yes', companyId],
    );

    if (!companyResult.rows[0]) return undefined;

    const factoryResult = await client.query<FactoryRow>(
      `SELECT id, factory_name, region_name, address, pollutant_type, run_status,
              wgs_lon::text AS wgs_lon, wgs_lat::text AS wgs_lat, create_time::text AS create_time
       FROM co_polluter_factory WHERE enterprise_id = $1 AND (deleted IS NULL OR deleted = 0)
       ORDER BY id`,
      [companyId],
    );

    return {
      ...mapCompanyDetail(companyResult.rows[0]),
      factories: factoryResult.rows.map(mapFactory),
    };
  });

  if (!result) throw new HTTPException(404, { message: '企业不存在' });
  return success(c, result);
});

export default AiEnterpriseRoutes;
