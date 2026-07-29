export interface EmrArchiveItem {
  ai_guide?: string;
  category_code?: string;
  category_name?: string;
  create_time?: string;
  dept_name?: string;
  doc_no?: string;
  id: number;
  process_status?: string;
  responsible_party?: string;
  title?: string;
  year?: string;
}

export interface EmergencyMaterial {
  category?: string;
  contact_person?: string;
  contact_phone?: string;
  create_time?: string;
  expire_date?: string;
  id: number;
  material_name?: string;
  remark?: string;
  specification?: string;
  stock_num?: number;
  storage_location?: string;
  unit?: string;
  usable_status?: string;
}

export interface EmergencyExpert {
  available_status?: string;
  contact_phone?: string;
  create_time?: string;
  expert_type?: string;
  gender?: string;
  id: number;
  major?: string;
  name?: string;
  position?: string;
  remark?: string;
  title?: string;
  unit?: string;
}

export interface PagedData<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

type ApiEnvelope<T> = { code: number; data: T; msg?: string };

const EMERGENCY_API_BASE = '/api/v1/ai-emergency';

const authHeaders = (token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {});

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) return undefined as T;
  const payload = JSON.parse(text) as ApiEnvelope<T> | T;
  if (payload && typeof payload === 'object' && 'code' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.code !== 200) throw new Error(envelope.msg || '请求失败');
    return envelope.data;
  }
  return payload as T;
};

const request = async <T>(path: string, options?: RequestInit, token?: string | null) => {
  const isJsonBody = options?.body != null && !(options.body instanceof FormData);
  const response = await fetch(`${EMERGENCY_API_BASE}${path}`, {
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

export const getEmrArchives = (params: {
  authToken?: string | null;
  page?: number;
  search?: string;
  size?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  return request<PagedData<EmrArchiveItem>>(`/${query ? `?${query}` : ''}`, undefined, params.authToken);
};

export const getMaterials = (params: {
  authToken?: string | null;
  category?: string;
  page?: number;
  query?: string;
  size?: number;
  usable_status?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.query) searchParams.set('query', params.query);
  if (params.category) searchParams.set('category', params.category);
  if (params.usable_status) searchParams.set('usable_status', params.usable_status);
  const qs = searchParams.toString();
  return request<PagedData<EmergencyMaterial>>(
    `/materials${qs ? `?${qs}` : ''}`,
    undefined,
    params.authToken,
  );
};

export const createMaterial = (payload: Partial<EmergencyMaterial>, authToken?: string | null) =>
  request<{ id: number }>('/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, authToken);

export const updateMaterial = (
  id: number,
  payload: Partial<EmergencyMaterial>,
  authToken?: string | null,
) =>
  request<{ id: number }>(`/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, authToken);

export const deleteMaterial = (id: number, authToken?: string | null) =>
  request<null>(`/materials/${id}`, { method: 'DELETE' }, authToken);

export const getExperts = (params: {
  authToken?: string | null;
  available_status?: string;
  major?: string;
  page?: number;
  query?: string;
  size?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.query) searchParams.set('query', params.query);
  if (params.major) searchParams.set('major', params.major);
  if (params.available_status) searchParams.set('available_status', params.available_status);
  const qs = searchParams.toString();
  return request<PagedData<EmergencyExpert>>(
    `/experts${qs ? `?${qs}` : ''}`,
    undefined,
    params.authToken,
  );
};

export const createExpert = (payload: Partial<EmergencyExpert>, authToken?: string | null) =>
  request<{ id: number }>('/experts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, authToken);

export const updateExpert = (
  id: number,
  payload: Partial<EmergencyExpert>,
  authToken?: string | null,
) =>
  request<{ id: number }>(`/experts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, authToken);

export const deleteExpert = (id: number, authToken?: string | null) =>
  request<null>(`/experts/${id}`, { method: 'DELETE' }, authToken);
