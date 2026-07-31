import type { AssessmentStepState, AssessmentWorkflowRecord } from './shared';

export type EiaStepState = AssessmentStepState;
export type EiaRecord = AssessmentWorkflowRecord;

export interface PagedData<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

const EIA_API_BASE = '/api/v1/ai-eia';

export const getEiaAuthToken = (session?: unknown): string | null =>
  (session as { accessToken?: string } | null | undefined)?.accessToken ?? null;

const authHeaders = (token?: string | null): Headers => {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) return undefined as T;
  const payload = JSON.parse(text) as { code: number; data: T; msg?: string } | T;
  if (payload && typeof payload === 'object' && 'code' in payload) {
    const envelope = payload as { code: number; data: T; msg?: string };
    if (envelope.code !== 200) throw new Error(envelope.msg || '请求失败');
    return envelope.data;
  }
  return payload as T;
};

const request = async <T>(path: string, options?: RequestInit, token?: string | null) => {
  const isJsonBody = options?.body != null && !(options.body instanceof FormData);
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (isJsonBody) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${EIA_API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    let messageText = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { error?: string; message?: string; msg?: string };
      messageText = err.msg || err.message || err.error || messageText;
    } catch {
      /* 保留默认 HTTP 状态描述 */
    }
    throw new Error(messageText);
  }
  return parseResponse<T>(response);
};

export const listEia = (params: {
  authToken?: string | null;
  keyword?: string;
  page?: number;
  size?: number;
}) => {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.keyword) sp.set('keyword', params.keyword);
  const qs = sp.toString();
  return request<PagedData<EiaRecord>>(`/${qs ? `?${qs}` : ''}`, undefined, params.authToken);
};

export const createEia = (summary_text: string, authToken?: string | null) =>
  request<EiaRecord>('/', { body: JSON.stringify({ summary_text }), method: 'POST' }, authToken);

export const getEia = (id: number, authToken?: string | null) =>
  request<EiaRecord>(`/${id}`, undefined, authToken);

export const updateEia = (
  id: number,
  payload: Pick<EiaRecord, 'completed' | 'currentStep' | 'steps'>,
  authToken?: string | null,
) =>
  request<EiaRecord>(
    `/${id}`,
    {
      body: JSON.stringify({
        completed: payload.completed,
        currentStep: payload.currentStep,
        steps: payload.steps,
      }),
      method: 'PUT',
    },
    authToken,
  );

/**
 * AI 分析 / 判定（对应旧 POST /api/eia-assessments/:id/analyze）
 * stepId: industry | type | admission | conclusion
 * targetId: admission 步骤下的子步骤 id，空间维度写 `spatial:<aspectId>`
 */
export const analyzeEia = (params: {
  authToken?: string | null;
  id: number;
  signal?: AbortSignal;
  stepId: string;
  targetId?: string;
}) =>
  request<EiaRecord>(
    `/${params.id}/analyze`,
    {
      body: JSON.stringify({ stepId: params.stepId, targetId: params.targetId || '' }),
      method: 'POST',
      signal: params.signal,
    },
    params.authToken,
  );

export const deleteEia = (id: number, authToken?: string | null) =>
  request<null>(`/${id}`, { method: 'DELETE' }, authToken);

export const clearEia = (authToken?: string | null) =>
  request<null>('/', { method: 'DELETE' }, authToken);

/** 导出全部判定记录为 DOCX（后端 jszip 生成 WordprocessingML） */
export const exportEiaDocx = async (authToken?: string | null) => {
  const response = await fetch(`${EIA_API_BASE}/export`, { headers: authHeaders(authToken) });
  if (!response.ok) throw new Error(`导出失败：HTTP ${response.status}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ai-assessment-results-${new Date().toISOString().slice(0, 10)}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
