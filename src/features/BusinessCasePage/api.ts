export interface CaseArchiveItem {
  annex_name?: string;
  category_code?: string;
  create_time?: string;
  dept_name?: string;
  doc_no?: string;
  id: number;
  page_count?: number;
  pdf_url?: string;
  process_status?: string;
  remarks?: string;
  responsible_party?: string;
  title?: string;
  updated_at?: string;
  year?: string;
}

export interface PagedData<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

export interface ManagedArchiveUpsertPayload {
  annex_name?: string;
  category_code?: string;
  dept_name?: string;
  doc_no?: string;
  oss_hit_first_path?: string;
  page_count?: number;
  remarks?: string;
  responsible_party?: string;
  title: string;
  year?: string;
}

type ApiEnvelope<T> = {
  code: number;
  data: T;
  msg?: string;
};

const CASE_API_BASE = '/api/v1/case-archives';

const authHeaders = (token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {});

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) return undefined as T;

  const payload = JSON.parse(text) as ApiEnvelope<T> | T;

  if (payload && typeof payload === 'object' && 'code' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.code !== 200) {
      throw new Error(envelope.msg || '请求失败');
    }
    return envelope.data;
  }

  return payload as T;
};

const request = async <T>(path: string, options?: RequestInit, token?: string | null) => {
  const isJsonBody =
    options?.body != null && !(options.body instanceof FormData) && !(options.body instanceof Blob);
  const response = await fetch(`${CASE_API_BASE}${path}`, {
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

export const getCaseArchives = (params: {
  authToken?: string | null;
  page?: number;
  search?: string;
  size?: number;
  title?: string;
  docNo?: string;
  year?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.search) searchParams.set('search', params.search);
  if (params.title) searchParams.set('title', params.title);
  if (params.docNo) searchParams.set('doc_no', params.docNo);
  if (params.year) searchParams.set('year', params.year);

  const query = searchParams.toString();
  return request<PagedData<CaseArchiveItem>>(`/${query ? `?${query}` : ''}`, undefined, params.authToken);
};

export const getCaseArchive = (id: number, authToken?: string | null) =>
  request<CaseArchiveItem>(`/${id}`, undefined, authToken);

export const uploadCaseArchive = (file: File, authToken?: string | null) => {
  const formData = new FormData();
  formData.append('file', file);
  return request<CaseArchiveItem>('/upload', { method: 'POST', body: formData }, authToken);
};

export const updateCaseArchive = (
  id: number,
  payload: ManagedArchiveUpsertPayload,
  authToken?: string | null,
) =>
  request<CaseArchiveItem>(
    `/${id}`,
    {
      body: JSON.stringify(payload),
      method: 'PUT',
    },
    authToken,
  );

export const deleteCaseArchive = (id: number, authToken?: string | null) =>
  request<void>(`/${id}`, { method: 'DELETE' }, authToken);

export const retryCaseArchiveProcess = (id: number, authToken?: string | null) =>
  request<CaseArchiveItem>(`/${id}/retry-process`, { method: 'POST' }, authToken);
