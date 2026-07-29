import type { Session } from '@/libs/better-auth/auth-client';

export interface EiaStepState {
  content?: string;
  status?: string;
  data?: unknown;
}

export interface EiaRecord {
  id: number;
  bizId: string;
  summary: string;
  currentStep: string;
  completed: boolean;
  steps: Record<string, EiaStepState>;
  createdAt: string;
  updatedAt: string;
}

export interface PagedData<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

const EIA_API_BASE = '/api/v1/ai-eia';

const getToken = (session?: Session | null): string | null =>
  (session as { accessToken?: string } | null)?.accessToken ?? null;

const authHeaders = (token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {});

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
  const response = await fetch(`${EIA_API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!response.ok) {
    try {
      const err = (await response.json()) as { error?: string; msg?: string };
      throw new Error(err.msg || err.error || `HTTP ${response.status}`);
    } catch {
      throw new Error(`HTTP ${response.status}`);
    }
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
  request<EiaRecord>(
    '/',
    { method: 'POST', body: JSON.stringify({ summary_text }) },
    authToken,
  );

export const getEia = (id: number, authToken?: string | null) =>
  request<EiaRecord>(`/${id}`, undefined, authToken);

export const updateEia = (id: number, payload: Partial<EiaRecord>, authToken?: string | null) =>
  request<EiaRecord>(
    `/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        currentStep: payload.currentStep,
        completed: payload.completed,
        steps: payload.steps,
      }),
    },
    authToken,
  );

export const deleteEia = (id: number, authToken?: string | null) =>
  request<null>(`/${id}`, { method: 'DELETE' }, authToken);

export const clearEia = (authToken?: string | null) =>
  request<null>('/', { method: 'DELETE' }, authToken);
