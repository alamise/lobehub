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
const ENVIRONMENTAL_FUNC_MODULE_EIA = 1;
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

const emptyToNull = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

const newEnvironmentalModules = () => ({
  effluent_equipments: [] as QueryResultRow[],
  effluent_outlets: [] as QueryResultRow[],
  effluent_pollutions: [] as QueryResultRow[],
  facilities: [] as QueryResultRow[],
  fumes_equipments: [] as QueryResultRow[],
  fumes_outlets: [] as QueryResultRow[],
  fumes_pollutions: [] as QueryResultRow[],
  materials: [] as QueryResultRow[],
  pollution_discharges: [] as QueryResultRow[],
  processes: [] as QueryResultRow[],
  products: [] as QueryResultRow[],
  solid_waste_facilities: [] as QueryResultRow[],
  solid_waste_pollutions: [] as QueryResultRow[],
});

const toProjectKey = (factoryId: unknown, reportId: unknown) =>
  `${factoryId || 0}:${reportId || 0}`;

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

AiEnterpriseRoutes.get('/:id/environmental-assessment', async (c) => {
  const companyId = toPositiveInt(c.req.param('id'), 0);
  if (!companyId) throw new HTTPException(400, { message: 'Invalid company id' });

  const data = await withClient(async (client) => {
    const enterpriseResult = await client.query<QueryResultRow>(
      `SELECT id, name, former_name, enterprise_no, business_license, address, phone,
              legal_person, contact_name, contact_phone, industry, region_name,
              create_time::text AS create_time, update_time::text AS update_time
       FROM co_polluter_enterprise
       WHERE id = $1 AND (deleted IS NULL OR deleted = 0)`,
      [companyId],
    );
    const enterprise = enterpriseResult.rows[0];
    if (!enterprise) return undefined;

    const factoryResult = await client.query<QueryResultRow>(
      `SELECT id, factory_name, region_name, area, address, coordinate_text, introduction,
              env_leader_user_name, env_leader_phone, dire_industry_name,
              latest_report_date::text AS latest_report_date
       FROM co_polluter_factory
       WHERE enterprise_id = $1 AND (deleted IS NULL OR deleted = 0)
       ORDER BY id ASC`,
      [companyId],
    );

    const factories = factoryResult.rows.map((factory) => ({
      address: factory.address || '',
      area: factory.area || '',
      coordinate_text: factory.coordinate_text || '',
      dire_industry_name: factory.dire_industry_name || '',
      env_leader_phone: factory.env_leader_phone || '',
      env_leader_user_name: factory.env_leader_user_name || '',
      factory_name: factory.factory_name || '',
      id: Number(factory.id),
      introduction: factory.introduction || '',
      latest_report_date: factory.latest_report_date || null,
      projects: [] as QueryResultRow[],
      region_name: factory.region_name || '',
    }));

    const factoryIds = factories.map((factory) => factory.id);
    const result = {
      create_time: enterprise.create_time || '',
      enterprise: {
        address: enterprise.address || '',
        business_license: enterprise.business_license || '',
        contact_name: enterprise.contact_name || '',
        contact_phone: enterprise.contact_phone || '',
        enterprise_no: enterprise.enterprise_no || '',
        former_name: enterprise.former_name || '',
        id: Number(enterprise.id),
        industry: enterprise.industry || '',
        legal_person: enterprise.legal_person || '',
        name: enterprise.name || '',
        phone: enterprise.phone || '',
        region_name: enterprise.region_name || '',
      },
      factories,
      factory_count: factories.length,
      project_count: 0,
      update_time: enterprise.update_time || '',
    };

    if (factoryIds.length === 0) return result;

    const impactResult = await client.query<QueryResultRow>(
      `SELECT id, project_name, contact_person, contact_phone, address,
              wgs_lon::float8 AS wgs_lon, wgs_lat::float8 AS wgs_lat,
              gcj_lon::float8 AS gcj_lon, gcj_lat::float8 AS gcj_lat,
              dire_industry_nation_economy, dire_industry_project,
              project_nature, project_status, total_project_investment::float8 AS total_project_investment,
              build_content, factory_id, factory_name, evaluation_file_type,
              examination_approval, approval_time::text AS approval_time, organization_unit, approval_no,
              total_environmental_investment::float8 AS total_environmental_investment,
              remark, create_time::text AS create_time, update_time::text AS update_time,
              from_report_id
       FROM co_polluter_environmental_impact
       WHERE factory_id = ANY($1::bigint[])
         AND func_module = $2
         AND (deleted IS NULL OR deleted = 0)
       ORDER BY factory_id ASC, update_time DESC NULLS LAST, id DESC`,
      [factoryIds, ENVIRONMENTAL_FUNC_MODULE_EIA],
    );

    const reportIds = [
      ...new Set(
        impactResult.rows
          .map((row) => Number(row.from_report_id || 0))
          .filter((reportId) => reportId > 0),
      ),
    ];

    const archiveMeta = new Map<number, QueryResultRow>();
    if (reportIds.length > 0) {
      const archiveResult = await client.query<QueryResultRow>(
        `SELECT id, title, doc_no, category_code, receive_time::text AS receive_time,
                title_from_llm, title_in_excel, extracted_title
         FROM file_archive
         WHERE id = ANY($1::bigint[])`,
        [reportIds],
      );
      archiveResult.rows.forEach((archive) => archiveMeta.set(Number(archive.id), archive));
    }

    const factoryIndex = new Map(factories.map((factory, index) => [factory.id, index]));
    const projectNodes = new Map<string, QueryResultRow>();
    let latestUpdateTime = String(enterprise.update_time || '');

    impactResult.rows.forEach((impact) => {
      const factoryId = Number(impact.factory_id || 0);
      const reportId = Number(impact.from_report_id || 0);
      const key = toProjectKey(factoryId, reportId);
      if (projectNodes.has(key)) return;

      if (impact.update_time && String(impact.update_time) > latestUpdateTime) {
        latestUpdateTime = String(impact.update_time);
      }

      const archive = archiveMeta.get(reportId);
      const archiveTitle =
        archive &&
        emptyToNull(
          archive.title ||
            archive.title_from_llm ||
            archive.title_in_excel ||
            archive.extracted_title,
        );

      const project = {
        archive_category_code: archive ? emptyToNull(archive.category_code) : null,
        archive_doc_no: archive ? emptyToNull(archive.doc_no) : null,
        archive_id: archive ? Number(archive.id) : null,
        archive_receive_time: archive ? emptyToNull(archive.receive_time) : null,
        archive_title: archiveTitle,
        basic_info: {
          address: impact.address || null,
          approval_no: impact.approval_no || null,
          approval_time: impact.approval_time || null,
          build_content: impact.build_content || null,
          contact_person: impact.contact_person || null,
          contact_phone: impact.contact_phone || null,
          create_time: impact.create_time || null,
          dire_industry_nation_economy: impact.dire_industry_nation_economy || null,
          dire_industry_project: impact.dire_industry_project || null,
          evaluation_file_type: impact.evaluation_file_type ?? null,
          examination_approval: impact.examination_approval || null,
          factory_id: impact.factory_id == null ? null : Number(impact.factory_id),
          factory_name: impact.factory_name || null,
          gcj_lat: impact.gcj_lat ?? null,
          gcj_lon: impact.gcj_lon ?? null,
          id: Number(impact.id),
          organization_unit: impact.organization_unit || null,
          project_name: impact.project_name || null,
          project_nature: impact.project_nature ?? null,
          project_status: impact.project_status ?? null,
          remark: impact.remark || null,
          total_environmental_investment: impact.total_environmental_investment ?? null,
          total_project_investment: impact.total_project_investment ?? null,
          update_time: impact.update_time || null,
          wgs_lat: impact.wgs_lat ?? null,
          wgs_lon: impact.wgs_lon ?? null,
        },
        id: Number(impact.id),
        modules: newEnvironmentalModules(),
      };

      projectNodes.set(key, project);
      const index = factoryIndex.get(factoryId);
      if (index !== undefined) {
        factories[index].projects.push(project);
        result.project_count += 1;
      }
    });

    if (projectNodes.size === 0) {
      result.update_time = latestUpdateTime;
      return result;
    }

    const appendModuleRows = async (
      table: string,
      moduleName: keyof ReturnType<typeof newEnvironmentalModules>,
      selectColumns: string,
    ) => {
      const rowsResult = await client.query<QueryResultRow>(
        `SELECT ${selectColumns}, factory_id, from_report_id
         FROM ${table}
         WHERE factory_id = ANY($1::bigint[])
           AND func_module = $2
           AND (deleted IS NULL OR deleted = 0)
         ORDER BY factory_id ASC, from_report_id ASC, id ASC`,
        [factoryIds, ENVIRONMENTAL_FUNC_MODULE_EIA],
      );

      rowsResult.rows.forEach((row) => {
        const project = projectNodes.get(toProjectKey(row.factory_id, row.from_report_id));
        if (!project) return;
        delete row.factory_id;
        delete row.from_report_id;
        project.modules[moduleName].push(row);
      });
    };

    await appendModuleRows(
      'co_polluter_element_product_productivity',
      'products',
      'id, factory_name, approval_product_name, approval_productivity::float8 AS approval_productivity, unit_name',
    );
    await appendModuleRows(
      'co_polluter_element_process',
      'processes',
      'id, name, flow, description',
    );
    await appendModuleRows(
      'co_polluter_element_process_facilities',
      'facilities',
      'id, technology_name, approval_facility_name, approval_facility_count, facility_model, unit_name',
    );
    await appendModuleRows(
      'co_polluter_element_material',
      'materials',
      'id, category, type, spec_param, approval_material_name, approval_use_amount::float8 AS approval_use_amount, unit_name',
    );
    await appendModuleRows(
      'co_element_effluent_equipment',
      'effluent_equipments',
      'id, effluent_equipment_name, effluent_equipment_no, effluent_equipment_type, effluent_collection_type, effluent_equipment_technics, effluent_equipment_ability, effluent_equipment_location, remark',
    );
    await appendModuleRows(
      'co_element_effluent_outlet',
      'effluent_outlets',
      'id, effluent_outlet_name, effluent_outlet_no, effluent_outlet_location, effluent_outlet_pattern::text AS effluent_outlet_pattern, effluent_outlet_direction',
    );
    await appendModuleRows(
      'co_element_effluent_pollution',
      'effluent_pollutions',
      'id, effluent_pollution_name, effluent_pollution_standard_name, effluent_pollution_standard_value::float8 AS effluent_pollution_standard_value, effluent_pollution_standard_unit',
    );
    await appendModuleRows(
      'co_element_fumes_equipment',
      'fumes_equipments',
      'id, fumes_equipment_name, fumes_equipment_no, fumes_equipment_location, fumes_equipment_technics, fumes_equipment_ability, fumes_collection_type, remark',
    );
    await appendModuleRows(
      'co_element_fumes_outlet',
      'fumes_outlets',
      'id, fumes_outlet_name, fumes_outlet_no, fumes_outlet_location, fumes_outlet_pattern, fumes_outlet_high::float8 AS fumes_outlet_high, fumes_outlet_inner_diameter::float8 AS fumes_outlet_inner_diameter',
    );
    await appendModuleRows(
      'co_element_fumes_pollution',
      'fumes_pollutions',
      'id, fumes_pollution_name, fumes_pollution_standard_name, concentration_value::float8 AS concentration_value, concentration_unit, velocity_value::float8 AS velocity_value, velocity_unit',
    );
    await appendModuleRows(
      'co_polluter_element_solid_waste_facility',
      'solid_waste_facilities',
      'id, name, no, scale::float8 AS scale, location',
    );
    await appendModuleRows(
      'co_polluter_element_solid_waste_pollution',
      'solid_waste_pollutions',
      'id, name, unit_name, variety, type, code, description, approval_produce_amount::float8 AS approval_produce_amount, approval_produce_way',
    );
    await appendModuleRows(
      'co_element_pollution_discharge',
      'pollution_discharges',
      'id, pollution_discharge_type, pollution_discharge_name, pollution_discharge_approval_amount::float8 AS pollution_discharge_approval_amount, pollution_discharge_unit_name',
    );

    result.update_time = latestUpdateTime;
    return result;
  });

  if (!data) throw new HTTPException(404, { message: '企业不存在' });
  return success(c, data);
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
