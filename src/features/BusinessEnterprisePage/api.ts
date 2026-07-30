export interface EnterpriseSummary {
  address?: string;
  archive_count?: number;
  enterprise_no?: string;
  id: number;
  industry?: string;
  legal_person?: string;
  name?: string;
  phone?: string;
  region_name?: string;
}

export interface EnterpriseFactory {
  address?: string;
  create_time?: string;
  factory_name?: string;
  id: number;
  pollutant_type?: string;
  region_name?: string;
  run_status?: string;
  wgs_lat?: string;
  wgs_lon?: string;
}

export interface EnterpriseArchive {
  category_code?: string;
  category_name?: string;
  create_time?: string;
  dept_name?: string;
  doc_no?: string;
  id: number;
  page_count?: number;
  process_status?: string;
  responsible_party?: string;
  title?: string;
  year?: string;
}

export interface EnterpriseDetail extends EnterpriseSummary {
  business_license?: string;
  contact_name?: string;
  contact_phone?: string;
  establish_time?: string;
  factories?: EnterpriseFactory[];
  former_name?: string;
}

export interface UpdateEnterpriseRequest {
  address: string;
  business_license: string;
  contact_name: string;
  contact_phone: string;
  enterprise_no: string;
  former_name: string;
  industry: string;
  legal_person: string;
  name: string;
  phone: string;
  region_name: string;
}

export interface PagedData<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

type ApiEnvelope<T> = { code: number; data: T; msg?: string };

const ENTERPRISE_API_BASE = '/api/v1/ai-enterprise';

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
  const response = await fetch(`${ENTERPRISE_API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
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

export const getEnterprises = (params: {
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
  return request<PagedData<EnterpriseSummary>>(
    `/${query ? `?${query}` : ''}`,
    undefined,
    params.authToken,
  );
};

export const getEnterprise = (id: number, authToken?: string | null) =>
  request<EnterpriseDetail>(`/${id}`, undefined, authToken);

export const updateEnterprise = (
  id: number,
  data: UpdateEnterpriseRequest,
  authToken?: string | null,
) =>
  request<void>(
    `/${id}`,
    {
      body: JSON.stringify(data),
      method: 'PUT',
    },
    authToken,
  );

export const getEnterpriseArchives = (id: number, authToken?: string | null) =>
  request<{ list: EnterpriseArchive[] }>(`/${id}/archives`, undefined, authToken);

export const getEnterpriseGuideQuestions = (id: number, authToken?: string | null) =>
  request<{ questions: string[] }>(`/${id}/guide-questions`, undefined, authToken);
