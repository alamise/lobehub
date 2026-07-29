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

const AiEmergencyRoutes = new Hono();

const EMR_SCOPE = 'emr';
const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;

interface EmrArchiveRow extends QueryResultRow {
  id: number;
  title: string | null;
  doc_no: string | null;
  year: string | null;
  category_code: string | null;
  category_name: string | null;
  responsible_party: string | null;
  dept_name: string | null;
  process_status: string | null;
  ai_guide: string | null;
  create_time: string | null;
}

const mapEmrArchive = (row: EmrArchiveRow) => ({
  ai_guide: row.ai_guide || '',
  category_code: row.category_code || '',
  category_name: row.category_name || '',
  create_time: row.create_time || '',
  dept_name: row.dept_name || '',
  doc_no: row.doc_no || '',
  id: Number(row.id),
  process_status: row.process_status || 'pending',
  responsible_party: row.responsible_party || '',
  title: row.title || '',
  year: row.year || '',
});

AiEmergencyRoutes.use('*', requireLobeSession);

// ---------------------------------------------------------------------------
// Emergency archive knowledge (file_archive scope = 'emr')
// ---------------------------------------------------------------------------

AiEmergencyRoutes.get('/', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;

  const params: unknown[] = ['yes', EMR_SCOPE];
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

  const categoryPrefix = url.searchParams.get('category_prefix');
  if (categoryPrefix) {
    params.push(`${escapeLike(categoryPrefix)}%`);
    where.push(`fa.category_code LIKE $${params.length} ESCAPE '\\'`);
  }

  const extraWhere = where.length ? `AND ${where.join(' AND ')}` : '';

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE fa.visible = $1 AND fa.scope = $2 ${extraWhere}`,
      params,
    );

    const rowsResult = await client.query<EmrArchiveRow>(
      `SELECT fa.id, fa.title, fa.doc_no, fa.year, fa.category_code, ac.name AS category_name,
              fa.responsible_party, fa.dept_name, fa.process_status, fa.ai_guide,
              fa.receive_time::text AS create_time
       FROM file_archive fa
       LEFT JOIN archive_category ac ON fa.category_code = ac.code
       WHERE fa.visible = $1 AND fa.scope = $2 ${extraWhere}
       ORDER BY fa.receive_time DESC NULLS LAST, fa.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );

    return {
      list: rowsResult.rows.map(mapEmrArchive),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

// ---------------------------------------------------------------------------
// Emergency materials (emergency_material)
// ---------------------------------------------------------------------------

const materialColumns = `id, material_name, category, specification, unit, stock_num,
  storage_location, contact_person, contact_phone, usable_status, expire_date, remark,
  create_time::text AS create_time`;

const mapMaterial = (r: QueryResultRow) => ({
  category: r.category || '',
  contact_person: r.contact_person || '',
  contact_phone: r.contact_phone || '',
  create_time: r.create_time || '',
  expire_date: r.expire_date || '',
  id: Number(r.id),
  material_name: r.material_name || '',
  remark: r.remark || '',
  specification: r.specification || '',
  stock_num: r.stock_num == null ? 0 : Number(r.stock_num),
  storage_location: r.storage_location || '',
  unit: r.unit || '',
  usable_status: r.usable_status || '',
});

AiEmergencyRoutes.get('/materials', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;

  const params: unknown[] = [];
  const where: string[] = ["(deleted IS NULL OR deleted = 0)"];
  const query = url.searchParams.get('query');
  if (query) {
    params.push(`%${escapeLike(query)}%`);
    where.push(`(material_name ILIKE $${params.length} ESCAPE '\\' OR contact_person ILIKE $${params.length} ESCAPE '\\')`);
  }
  const category = url.searchParams.get('category');
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  const usableStatus = url.searchParams.get('usable_status');
  if (usableStatus) {
    params.push(usableStatus);
    where.push(`usable_status = $${params.length}`);
  }

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM emergency_material WHERE ${where.join(' AND ')}`,
      params,
    );
    const rowsResult = await client.query(
      `SELECT ${materialColumns} FROM emergency_material
       WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );
    return {
      list: rowsResult.rows.map(mapMaterial),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

const parseMaterialPayload = async (c: Context) => {
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.material_name);
  if (!name) throw new HTTPException(400, { message: '物资名称不能为空' });
  const stock = Number(body.stock_num);
  return {
    material_name: name,
    category: str(body.category),
    specification: str(body.specification),
    unit: str(body.unit),
    stock_num: Number.isFinite(stock) && stock >= 0 ? stock : 0,
    storage_location: str(body.storage_location),
    contact_person: str(body.contact_person),
    contact_phone: str(body.contact_phone),
    usable_status: str(body.usable_status),
    expire_date: str(body.expire_date),
    remark: str(body.remark),
  };
};

AiEmergencyRoutes.post('/materials', async (c) => {
  const p = await parseMaterialPayload(c);
  const id = await withClient(async (client) => {
    const result = await client.query<{ id: number }>(
      `INSERT INTO emergency_material
       (material_name, category, specification, unit, stock_num, storage_location,
        contact_person, contact_phone, usable_status, expire_date, remark, create_time, update_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW()) RETURNING id`,
      [
        p.material_name, p.category, p.specification, p.unit, p.stock_num, p.storage_location,
        p.contact_person, p.contact_phone, p.usable_status, p.expire_date || null, p.remark,
      ],
    );
    return result.rows[0].id;
  });
  return success(c, { id });
});

AiEmergencyRoutes.put('/materials/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid material id' });
  const p = await parseMaterialPayload(c);
  await withClient((client) =>
    client.query(
      `UPDATE emergency_material SET
         material_name=$1, category=$2, specification=$3, unit=$4, stock_num=$5, storage_location=$6,
         contact_person=$7, contact_phone=$8, usable_status=$9, expire_date=$10, remark=$11, update_time=NOW()
       WHERE id=$12 AND (deleted IS NULL OR deleted = 0)`,
      [
        p.material_name, p.category, p.specification, p.unit, p.stock_num, p.storage_location,
        p.contact_person, p.contact_phone, p.usable_status, p.expire_date || null, p.remark, id,
      ],
    ),
  );
  return success(c, { id });
});

AiEmergencyRoutes.delete('/materials/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid material id' });
  const result = await withClient((client) =>
    client.query(`UPDATE emergency_material SET deleted = 1 WHERE id = $1 AND (deleted IS NULL OR deleted = 0)`, [id]),
  );
  if ((result.rowCount || 0) === 0) throw new HTTPException(404, { message: '物资不存在' });
  return success(c, null);
});

// ---------------------------------------------------------------------------
// Emergency experts (emergency_expert)
// ---------------------------------------------------------------------------

const expertColumns = `id, name, gender, title, major, unit, position, contact_phone,
  expert_type, available_status, remark, create_time::text AS create_time`;

const mapExpert = (r: QueryResultRow) => ({
  available_status: r.available_status || '',
  contact_phone: r.contact_phone || '',
  create_time: r.create_time || '',
  expert_type: r.expert_type || '',
  gender: r.gender || '',
  id: Number(r.id),
  major: r.major || '',
  name: r.name || '',
  position: r.position || '',
  remark: r.remark || '',
  title: r.title || '',
  unit: r.unit || '',
});

AiEmergencyRoutes.get('/experts', async (c) => {
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;

  const params: unknown[] = [];
  const where: string[] = ["(deleted IS NULL OR deleted = 0)"];
  const query = url.searchParams.get('query');
  if (query) {
    params.push(`%${escapeLike(query)}%`);
    where.push(`(name ILIKE $${params.length} ESCAPE '\\' OR unit ILIKE $${params.length} ESCAPE '\\' OR major ILIKE $${params.length} ESCAPE '\\')`);
  }
  const major = url.searchParams.get('major');
  if (major) {
    params.push(major);
    where.push(`major = $${params.length}`);
  }
  const availableStatus = url.searchParams.get('available_status');
  if (availableStatus) {
    params.push(availableStatus);
    where.push(`available_status = $${params.length}`);
  }

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM emergency_expert WHERE ${where.join(' AND ')}`,
      params,
    );
    const rowsResult = await client.query(
      `SELECT ${expertColumns} FROM emergency_expert
       WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );
    return {
      list: rowsResult.rows.map(mapExpert),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

const parseExpertPayload = async (c: Context) => {
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name);
  if (!name) throw new HTTPException(400, { message: '专家姓名不能为空' });
  return {
    name,
    gender: str(body.gender),
    title: str(body.title),
    major: str(body.major),
    unit: str(body.unit),
    position: str(body.position),
    contact_phone: str(body.contact_phone),
    expert_type: str(body.expert_type),
    available_status: str(body.available_status),
    remark: str(body.remark),
  };
};

AiEmergencyRoutes.post('/experts', async (c) => {
  const p = await parseExpertPayload(c);
  const id = await withClient(async (client) => {
    const result = await client.query<{ id: number }>(
      `INSERT INTO emergency_expert
       (name, gender, title, major, unit, position, contact_phone, expert_type, available_status, remark, create_time, update_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW()) RETURNING id`,
      [p.name, p.gender, p.title, p.major, p.unit, p.position, p.contact_phone, p.expert_type, p.available_status, p.remark],
    );
    return result.rows[0].id;
  });
  return success(c, { id });
});

AiEmergencyRoutes.put('/experts/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid expert id' });
  const p = await parseExpertPayload(c);
  await withClient((client) =>
    client.query(
      `UPDATE emergency_expert SET
         name=$1, gender=$2, title=$3, major=$4, unit=$5, position=$6, contact_phone=$7,
         expert_type=$8, available_status=$9, remark=$10, update_time=NOW()
       WHERE id=$11 AND (deleted IS NULL OR deleted = 0)`,
      [p.name, p.gender, p.title, p.major, p.unit, p.position, p.contact_phone, p.expert_type, p.available_status, p.remark, id],
    ),
  );
  return success(c, { id });
});

AiEmergencyRoutes.delete('/experts/:id', async (c) => {
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid expert id' });
  const result = await withClient((client) =>
    client.query(`UPDATE emergency_expert SET deleted = 1 WHERE id = $1 AND (deleted IS NULL OR deleted = 0)`, [id]),
  );
  if ((result.rowCount || 0) === 0) throw new HTTPException(404, { message: '专家不存在' });
  return success(c, null);
});

export default AiEmergencyRoutes;
