import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { QueryResultRow } from 'pg';

import {
  normalizeSize,
  requireLobeSession,
  success,
  toPositiveInt,
  withClient,
} from './legacyDb';

const AiEiaRoutes = new Hono();

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;

const STEP_KEYS = ['summary', 'industry', 'type', 'admission', 'conclusion'] as const;
type StepKey = (typeof STEP_KEYS)[number];

interface StepState {
  content?: string;
  status?: string;
  data?: unknown;
}

interface EiaRecordRow extends QueryResultRow {
  id: number;
  biz_id: string | null;
  summary_text: string | null;
  current_step: string | null;
  completed: boolean | null;
  steps_payload: unknown;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface EiaRecordDTO {
  id: number;
  bizId: string;
  summary: string;
  currentStep: string;
  completed: boolean;
  steps: Record<string, StepState>;
  createdAt: string;
  updatedAt: string;
}

const emptySteps = (): Record<string, StepState> => ({
  summary: { content: '' },
  industry: { content: '' },
  type: { content: '' },
  admission: { content: '' },
  conclusion: { content: '' },
});

const mapRecord = (row: EiaRecordRow): EiaRecordDTO => {
  let steps: Record<string, StepState> = emptySteps();
  try {
    if (row.steps_payload && typeof row.steps_payload === 'object') {
      steps = { ...emptySteps(), ...(row.steps_payload as Record<string, StepState>) };
    }
  } catch {
    steps = emptySteps();
  }
  if (!steps.summary) steps.summary = { content: '' };
  steps.summary = { ...steps.summary, content: steps.summary.content || row.summary_text || '' };

  return {
    bizId: row.biz_id || '',
    completed: Boolean(row.completed),
    createdAt: row.created_at || '',
    currentStep: row.current_step || 'summary',
    id: Number(row.id),
    steps,
    summary: (steps.summary?.content || row.summary_text || '').toString(),
    updatedAt: row.updated_at || '',
  };
};

AiEiaRoutes.use('*', requireLobeSession);

// ---------------------------------------------------------------------------
// List (per-user isolation by created_by)
// ---------------------------------------------------------------------------

AiEiaRoutes.get('/', async (c) => {
  const userId = c.get('userId') as string;
  const url = new URL(c.req.url);
  const page = toPositiveInt(url.searchParams.get('page'), DEFAULT_PAGE);
  const size = normalizeSize(url.searchParams.get('size'));
  const offset = (page - 1) * size;
  const keyword = url.searchParams.get('keyword')?.trim();

  const params: unknown[] = [userId];
  const where: string[] = ['deleted IS NOT TRUE', 'created_by = $1'];
  if (keyword) {
    params.push(`%${keyword}%`);
    where.push(`summary_text ILIKE $${params.length}`);
  }

  const data = await withClient(async (client) => {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM eia_assessment_record WHERE ${where.join(' AND ')}`,
      params,
    );
    const rowsResult = await client.query<EiaRecordRow>(
      `SELECT id, biz_id, summary_text, current_step, completed, steps_payload, created_by,
              created_at::text AS created_at, updated_at::text AS updated_at
       FROM eia_assessment_record
       WHERE ${where.join(' AND ')}
       ORDER BY updated_at DESC NULLS LAST, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );
    return {
      list: rowsResult.rows.map(mapRecord),
      page,
      size,
      total: Number(countResult.rows[0]?.total || 0),
    };
  });

  return success(c, data);
});

// ---------------------------------------------------------------------------
// Create (writes summary, current step = industry)
// ---------------------------------------------------------------------------

AiEiaRoutes.post('/', async (c) => {
  const userId = c.get('userId') as string;
  let body: { summary_text?: unknown };
  try {
    body = (await c.req.json()) as { summary_text?: unknown };
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
  const summary =
    typeof body.summary_text === 'string' ? body.summary_text.trim() : '';
  if (!summary) throw new HTTPException(400, { message: '环评摘要不能为空' });

  const bizId = `EIA${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const steps = emptySteps();
  steps.summary = { content: summary };

  const id = await withClient(async (client) => {
    const result = await client.query<{ id: number }>(
      `INSERT INTO eia_assessment_record
       (biz_id, summary_text, current_step, completed, steps_payload, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,false,$4,$5,NOW(),NOW()) RETURNING id`,
      [bizId, summary, 'industry', JSON.stringify(steps), userId],
    );
    return result.rows[0].id;
  });

  const record = await withClient(async (client) => {
    const r = await client.query<EiaRecordRow>(
      `SELECT id, biz_id, summary_text, current_step, completed, steps_payload, created_by,
              created_at::text AS created_at, updated_at::text AS updated_at
       FROM eia_assessment_record WHERE id = $1`,
      [id],
    );
    return r.rows[0];
  });

  return success(c, mapRecord(record));
});

// ---------------------------------------------------------------------------
// Get single
// ---------------------------------------------------------------------------

AiEiaRoutes.get('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid record id' });

  const record = await withClient(async (client) => {
    const r = await client.query<EiaRecordRow>(
      `SELECT id, biz_id, summary_text, current_step, completed, steps_payload, created_by,
              created_at::text AS created_at, updated_at::text AS updated_at
       FROM eia_assessment_record
       WHERE id = $1 AND deleted IS NOT TRUE AND created_by = $2`,
      [id, userId],
    );
    return r.rows[0];
  });
  if (!record) throw new HTTPException(404, { message: '环评记录不存在' });

  return success(c, mapRecord(record));
});

// ---------------------------------------------------------------------------
// Update (full record: currentStep + completed + steps)
// ---------------------------------------------------------------------------

AiEiaRoutes.put('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid record id' });

  let body: {
    currentStep?: unknown;
    completed?: unknown;
    steps?: unknown;
  };
  try {
    body = (await c.req.json()) as {
      currentStep?: unknown;
      completed?: unknown;
      steps?: unknown;
    };
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }

  const currentStep = typeof body.currentStep === 'string' ? body.currentStep : 'industry';
  const completed = body.completed === true || body.completed === 'true';
  let steps = emptySteps();
  if (body.steps && typeof body.steps === 'object') {
    steps = { ...emptySteps(), ...(body.steps as Record<string, StepState>) };
  }
  const summary = (steps.summary?.content || '').toString();
  if (!summary) throw new HTTPException(400, { message: '环评摘要不能为空' });

  const result = await withClient(async (client) => {
    return client.query(
      `UPDATE eia_assessment_record
       SET summary_text=$1, current_step=$2, completed=$3, steps_payload=$4, updated_at=NOW()
       WHERE id=$5 AND deleted IS NOT TRUE AND created_by=$6`,
      [summary, currentStep, completed, JSON.stringify(steps), id, userId],
    );
  });
  if ((result.rowCount || 0) === 0) throw new HTTPException(404, { message: '环评记录不存在' });

  const record = await withClient(async (client) => {
    const r = await client.query<EiaRecordRow>(
      `SELECT id, biz_id, summary_text, current_step, completed, steps_payload, created_by,
              created_at::text AS created_at, updated_at::text AS updated_at
       FROM eia_assessment_record WHERE id = $1`,
      [id],
    );
    return r.rows[0];
  });

  return success(c, mapRecord(record));
});

// ---------------------------------------------------------------------------
// Delete single (soft)
// ---------------------------------------------------------------------------

AiEiaRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid record id' });

  const result = await withClient(async (client) => {
    return client.query(
      `UPDATE eia_assessment_record SET deleted = TRUE, updated_at = NOW()
       WHERE id=$1 AND deleted IS NOT TRUE AND created_by=$2`,
      [id, userId],
    );
  });
  if ((result.rowCount || 0) === 0) throw new HTTPException(404, { message: '环评记录不存在' });

  return success(c, null);
});

// ---------------------------------------------------------------------------
// Clear all (per user)
// ---------------------------------------------------------------------------

AiEiaRoutes.delete('/', async (c) => {
  const userId = c.get('userId') as string;
  await withClient(async (client) => {
    return client.query(
      `UPDATE eia_assessment_record SET deleted = TRUE, updated_at = NOW()
       WHERE deleted IS NOT TRUE AND created_by=$1`,
      [userId],
    );
  });
  return success(c, null);
});

export default AiEiaRoutes;
