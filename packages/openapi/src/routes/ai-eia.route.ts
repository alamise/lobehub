import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { QueryResultRow } from 'pg';

import {
  type AdmissionDecisionOutput,
  AgentCode,
  runAdmissionDecision,
  runConclusion,
  runIndustry,
  runType,
} from './eia/agents';
import { buildDocx, type DocxParagraph } from './eia/docx';
import { mustJsonCompact } from './eia/llm';
import { analyzeAcousticZone, analyzeControlZone, analyzeWaterProtection } from './eia/spatial';
import {
  applyAdmissionResult,
  applyConclusionResult,
  applyIndustryResult,
  applyTypeResult,
  mergeDefaultSteps,
  normalizeRecord,
  setAdmissionRunning,
  setIndustryRunning,
  setTypeRunning,
  type StepState,
  type WorkflowRecord,
} from './eia/state';
import { normalizeSize, requireLobeSession, success, toPositiveInt, withClient } from './legacyDb';

// workspaceId 由上游鉴权中间件按需写入；共享智能体调用会透传，缺省为 undefined 亦可（按智能体自身 workspaceId 解析）
const AiEiaRoutes = new Hono<{
  Variables: { authType?: string; userId: string; workspaceId?: string };
}>();

const DEFAULT_PAGE = 1;

interface EiaRecordRow extends QueryResultRow {
  biz_id: string | null;
  completed: boolean | null;
  created_at: string | null;
  created_by: string | null;
  current_step: string | null;
  id: number;
  steps_payload: unknown;
  summary_text: string | null;
  updated_at: string | null;
}

interface EiaRecordDTO {
  bizId: string;
  completed: boolean;
  createdAt: string;
  currentStep: string;
  id: number;
  steps: Record<string, StepState>;
  summary: string;
  updatedAt: string;
}

const SELECT_COLUMNS = `id, biz_id, summary_text, current_step, completed, steps_payload, created_by,
        created_at::text AS created_at, updated_at::text AS updated_at`;

const mapRecord = (row: EiaRecordRow): EiaRecordDTO => {
  const rawSteps =
    row.steps_payload && typeof row.steps_payload === 'object'
      ? (row.steps_payload as Record<string, Partial<StepState>>)
      : null;
  const steps = mergeDefaultSteps(rawSteps);
  if (!steps.summary.content) steps.summary.content = row.summary_text || '';

  return {
    bizId: row.biz_id || '',
    completed: Boolean(row.completed),
    createdAt: row.created_at || '',
    currentStep: row.current_step || 'summary',
    id: Number(row.id),
    steps,
    summary: steps.summary.content || '',
    updatedAt: row.updated_at || '',
  };
};

const toWorkflowRecord = (dto: EiaRecordDTO): WorkflowRecord => ({
  completed: dto.completed,
  createdAt: Date.parse(dto.createdAt) || Date.now(),
  currentStep: dto.currentStep,
  id: dto.bizId || String(dto.id),
  steps: dto.steps,
  updatedAt: Date.parse(dto.updatedAt) || Date.now(),
});

const fetchRow = async (id: number, userId: string): Promise<EiaRecordRow | undefined> =>
  withClient(async (client) => {
    const r = await client.query<EiaRecordRow>(
      `SELECT ${SELECT_COLUMNS} FROM eia_assessment_record
       WHERE id = $1 AND deleted IS NOT TRUE AND created_by = $2`,
      [id, userId],
    );
    return r.rows[0];
  });

const persistRecord = async (id: number, userId: string, record: WorkflowRecord) => {
  const normalized = normalizeRecord(record);
  const summary = (normalized.steps.summary.content || '').trim();
  await withClient(async (client) =>
    client.query(
      `UPDATE eia_assessment_record
       SET summary_text=$1, current_step=$2, completed=$3, steps_payload=$4, updated_at=NOW()
       WHERE id=$5 AND deleted IS NOT TRUE AND created_by=$6`,
      [
        summary,
        normalized.currentStep,
        normalized.completed,
        JSON.stringify(normalized.steps),
        id,
        userId,
      ],
    ),
  );
  return normalized;
};

const createRunLog = async (params: {
  recordId: number;
  recordBizId: string;
  stepId: string;
  targetId: string;
  agentCode: string;
  requestPayload: unknown;
  rawResponse: string;
  userId: string;
  error?: Error | null;
}) => {
  try {
    await withClient(async (client) =>
      client.query(
        `INSERT INTO eia_assessment_agent_run
         (record_id, record_biz_id, step_id, target_id, agent_code, run_status,
          request_payload, response_payload, error_message, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [
          params.recordId,
          params.recordBizId,
          params.stepId,
          params.targetId,
          params.agentCode,
          params.error ? 'error' : 'success',
          mustJsonCompact(params.requestPayload),
          mustJsonCompact({ raw: params.rawResponse }),
          params.error ? params.error.message : '',
          params.userId,
        ],
      ),
    );
  } catch (error) {
    console.warn('[ai-eia] 记录 Agent 运行日志失败', error);
  }
};

AiEiaRoutes.use('*', requireLobeSession);

// ---------------------------------------------------------------------------
// Export DOCX（必须在 /:id 之前注册）
// ---------------------------------------------------------------------------

const formatExportTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const deriveFinalDecision = (record: EiaRecordDTO): string => {
  const industry = record.steps.industry;
  const type = record.steps.type;
  const admission = record.steps.admission;
  const statuses = admission.admissionSubstepStatuses || {};

  if (industry.industryStatus !== 'completed' || !industry.industryResult) return '待补充信息';
  const allowed = type.typeResult?.submissionAllowed;
  if (type.typeStatus !== 'completed' || !type.typeResult) return '待补充信息';
  if (allowed === '不允许') return '未通过';
  if (allowed !== '允许') return '待补充信息';

  const key = [statuses.policy, statuses.spatial];
  if (key.includes('判定不通过')) return '未通过';
  if (key.includes('受限准入')) return '受限准入';
  if (
    key.some((item) => !item || item === '未判定' || item === '判定中' || item === '待补充信息')
  ) {
    return '待补充信息';
  }
  return '通过';
};

const buildConclusionContent = (record: EiaRecordDTO): string => {
  const parts: string[] = [];
  const push = (title: string, value?: string) => {
    const text = (value || '').trim();
    if (text) parts.push(`${title}\n${text}`);
  };
  push('一、建设项目简要说明', record.steps.summary.content);
  push('二、行业归类分析', record.steps.industry.content);
  push('三、环评类型分析', record.steps.type.content);
  push('四、准入判定', record.steps.admission.content);
  return parts.join('\n\n');
};

AiEiaRoutes.get('/export', async (c) => {
  const userId = c.get('userId') as string;
  const rows = await withClient(async (client) => {
    const r = await client.query<EiaRecordRow>(
      `SELECT ${SELECT_COLUMNS} FROM eia_assessment_record
       WHERE deleted IS NOT TRUE AND created_by = $1
       ORDER BY updated_at DESC NULLS LAST, id DESC`,
      [userId],
    );
    return r.rows;
  });
  const records = rows.map((row) => mapRecord(row));

  const exportedAt = new Date();
  const paragraphs: DocxParagraph[] = [
    { align: 'center', bold: true, size: 22, spacingAfter: 240, text: 'AI环评判定结果导出' },
    { spacingAfter: 120, text: `导出时间：${formatExportTime(exportedAt.toISOString())}` },
    { spacingAfter: 320, text: `记录总数：${records.length}` },
  ];

  if (records.length === 0) {
    paragraphs.push({ text: '暂无可导出的判定记录。' });
  }

  records.forEach((record, index) => {
    const finalDecision = deriveFinalDecision(record);
    const decisionContent = record.steps.conclusion.content || buildConclusionContent(record);
    paragraphs.push(
      {
        bold: true,
        size: 16,
        spacingAfter: 200,
        text: `记录 ${index + 1}`,
        thematicBreak: index > 0,
      },
      { spacingAfter: 120, text: `更新时间：${formatExportTime(record.updatedAt)}` },
      { spacingAfter: 120, text: `当前状态：${record.completed ? '已完成' : '未完成'}` },
      { bold: true, size: 14, spacingAfter: 120, text: '判定结果' },
      { spacingAfter: 120, text: `综合结论：${finalDecision}` },
    );
    for (const line of (decisionContent || '未填写').split('\n')) {
      paragraphs.push({ text: line });
    }
  });

  const buffer = await buildDocx(paragraphs);
  const filename = `ai-assessment-results-${exportedAt.toISOString().slice(0, 10)}.docx`;
  return c.body(new Uint8Array(buffer), 200, {
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
});

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
      `SELECT ${SELECT_COLUMNS}
       FROM eia_assessment_record
       WHERE ${where.join(' AND ')}
       ORDER BY updated_at DESC NULLS LAST, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, offset],
    );
    return {
      list: rowsResult.rows.map((row) => mapRecord(row)),
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
  const summary = typeof body.summary_text === 'string' ? body.summary_text.trim() : '';
  if (!summary) throw new HTTPException(400, { message: '环评摘要不能为空' });

  const bizId = `${Date.now()}`;
  const steps = mergeDefaultSteps(null);
  steps.summary = { content: summary, updatedAt: Date.now() };

  const id = await withClient(async (client) => {
    const result = await client.query<{ id: number }>(
      `INSERT INTO eia_assessment_record
       (biz_id, summary_text, current_step, completed, steps_payload, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,false,$4,$5,NOW(),NOW()) RETURNING id`,
      [bizId, summary, 'industry', JSON.stringify(steps), userId],
    );
    return result.rows[0].id;
  });

  const record = await fetchRow(id, userId);
  if (!record) throw new HTTPException(500, { message: '环评记录创建失败' });
  return success(c, mapRecord(record));
});

// ---------------------------------------------------------------------------
// Get single
// ---------------------------------------------------------------------------

AiEiaRoutes.get('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid record id' });

  const record = await fetchRow(id, userId);
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

  let body: { currentStep?: unknown; completed?: unknown; steps?: unknown };
  try {
    body = (await c.req.json()) as { currentStep?: unknown; completed?: unknown; steps?: unknown };
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }

  const existing = await fetchRow(id, userId);
  if (!existing) throw new HTTPException(404, { message: '环评记录不存在' });

  const currentStep = typeof body.currentStep === 'string' ? body.currentStep : 'industry';
  const completed = body.completed === true || body.completed === 'true';
  const steps = mergeDefaultSteps(
    body.steps && typeof body.steps === 'object'
      ? (body.steps as Record<string, Partial<StepState>>)
      : null,
  );
  const summary = (steps.summary.content || '').trim();
  if (!summary) throw new HTTPException(400, { message: '环评摘要不能为空' });

  await persistRecord(id, userId, {
    completed,
    createdAt: Date.now(),
    currentStep,
    id: existing.biz_id || String(id),
    steps,
    updatedAt: Date.now(),
  });

  const record = await fetchRow(id, userId);
  if (!record) throw new HTTPException(404, { message: '环评记录不存在' });
  return success(c, mapRecord(record));
});

// ---------------------------------------------------------------------------
// Analyze（对应旧 POST /api/eia-assessments/:id/analyze）
// ---------------------------------------------------------------------------

AiEiaRoutes.post('/:id/analyze', async (c) => {
  const userId = c.get('userId') as string;
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid record id' });

  let body: { stepId?: unknown; targetId?: unknown };
  try {
    body = (await c.req.json()) as { stepId?: unknown; targetId?: unknown };
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
  const stepId = typeof body.stepId === 'string' ? body.stepId : '';
  const targetId = typeof body.targetId === 'string' ? body.targetId : '';

  const row = await fetchRow(id, userId);
  if (!row) throw new HTTPException(404, { message: '环评记录不存在' });

  const dto = mapRecord(row);
  const record = normalizeRecord(toWorkflowRecord(dto));
  const bizId = dto.bizId || String(id);
  const requestPayload = { record, step_id: stepId, target_id: targetId };
  const signal = c.req.raw.signal;

  let agentCode = '';
  let rawResponse = '{}';

  const fail = async (error: Error) => {
    await createRunLog({
      agentCode,
      error,
      rawResponse,
      recordBizId: bizId,
      recordId: id,
      requestPayload,
      stepId,
      targetId,
      userId,
    });
    throw new HTTPException(500, { message: error.message });
  };

  switch (stepId) {
    case 'industry': {
      setIndustryRunning(record);
      await persistRecord(id, userId, record);
      agentCode = AgentCode.industry;
      try {
        const { data, raw } = await runIndustry({
          record,
          signal,
          stepId,
          targetId,
          userId,
          workspaceId: c.get('workspaceId'),
        });
        rawResponse = raw;
        applyIndustryResult(record, data);
      } catch (error) {
        return fail(error as Error);
      }
      break;
    }
    case 'type': {
      setTypeRunning(record);
      await persistRecord(id, userId, record);
      agentCode = AgentCode.type;
      try {
        const { data, raw } = await runType({
          record,
          signal,
          stepId,
          targetId,
          userId,
          workspaceId: c.get('workspaceId'),
        });
        rawResponse = raw;
        applyTypeResult(record, data);
      } catch (error) {
        return fail(error as Error);
      }
      break;
    }
    case 'admission': {
      if (!targetId) throw new HTTPException(400, { message: 'targetId 不能为空' });
      setAdmissionRunning(record, targetId);
      await persistRecord(id, userId, record);

      const spatialMapTargets = new Set([
        'spatial:waterProtection',
        'spatial:acousticZone',
        'spatial:threeLine',
      ]);
      try {
        let out: AdmissionDecisionOutput;
        if (spatialMapTargets.has(targetId)) {
          agentCode = AgentCode.spatial;
          const runner =
            targetId === 'spatial:waterProtection'
              ? analyzeWaterProtection
              : targetId === 'spatial:acousticZone'
                ? analyzeAcousticZone
                : analyzeControlZone;
          // 三线一单、饮用水水源保护区走共享智能体（内部 B 方案），必须带上 userId / workspaceId
          const { data, raw } = await runner({
            record,
            signal,
            stepId,
            targetId,
            userId,
            workspaceId: c.get('workspaceId'),
          });
          rawResponse = raw;
          out = data;
        } else {
          const result = await runAdmissionDecision({
            record,
            signal,
            stepId,
            targetId,
            userId,
            workspaceId: c.get('workspaceId'),
          });
          agentCode = result.agentCode;
          rawResponse = result.raw;
          out = result.data;
        }
        applyAdmissionResult(record, targetId, out);
      } catch (error) {
        return fail(error as Error);
      }
      break;
    }
    case 'conclusion': {
      agentCode = AgentCode.conclusion;
      try {
        const { data, raw } = await runConclusion({ record, signal, stepId, targetId });
        rawResponse = raw;
        applyConclusionResult(record, data);
      } catch (error) {
        return fail(error as Error);
      }
      break;
    }
    default: {
      throw new HTTPException(400, { message: `暂不支持的分析步骤: ${stepId}` });
    }
  }

  await persistRecord(id, userId, record);
  await createRunLog({
    agentCode,
    rawResponse,
    recordBizId: bizId,
    recordId: id,
    requestPayload,
    stepId,
    targetId,
    userId,
  });

  const refreshed = await fetchRow(id, userId);
  if (!refreshed) throw new HTTPException(404, { message: '环评记录不存在' });
  return success(c, mapRecord(refreshed));
});

// ---------------------------------------------------------------------------
// Delete single (soft)
// ---------------------------------------------------------------------------

AiEiaRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = toPositiveInt(c.req.param('id'), 0);
  if (!id) throw new HTTPException(400, { message: 'Invalid record id' });

  const result = await withClient(async (client) =>
    client.query(
      `UPDATE eia_assessment_record SET deleted = TRUE, updated_at = NOW()
       WHERE id=$1 AND deleted IS NOT TRUE AND created_by=$2`,
      [id, userId],
    ),
  );
  if ((result.rowCount || 0) === 0) throw new HTTPException(404, { message: '环评记录不存在' });

  return success(c, null);
});

// ---------------------------------------------------------------------------
// Clear all (per user)
// ---------------------------------------------------------------------------

AiEiaRoutes.delete('/', async (c) => {
  const userId = c.get('userId') as string;
  await withClient(async (client) =>
    client.query(
      `UPDATE eia_assessment_record SET deleted = TRUE, updated_at = NOW()
       WHERE deleted IS NOT TRUE AND created_by=$1`,
      [userId],
    ),
  );
  return success(c, null);
});

export default AiEiaRoutes;
