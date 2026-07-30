export interface KnowledgeItem {
  ai_guide: string;
  category_code: string;
  category_name: string;
  dept_name: string;
  doc_no: string;
  id: number;
  page_count: number;
  process_status: string;
  responsible_party: string;
  title: string;
  year: string;
}

export interface KnowledgePageItem {
  content: string;
  dpi?: number;
  file_name: string;
  governed_parse_result?: string;
  id: number;
  image_url?: string;
  oss_path?: string;
  page_num: number;
  parse_error?: string;
  parse_result?: string;
  parse_status: string;
  thumbnail_url?: string;
}

export interface KnowledgeCategory {
  code: string;
  description: string;
  name: string;
}

export interface PagedData<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

const KNOWLEDGE_API_BASE = '/api/v1/ai-knowledge';

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
  const response = await fetch(`${KNOWLEDGE_API_BASE}${path}`, {
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

export const listKnowledge = (params: {
  authToken?: string | null;
  category_code?: string;
  page?: number;
  responsible_party?: string;
  search?: string;
  size?: number;
  sort?: string;
  order?: string;
}) => {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  if (params.search) sp.set('search', params.search);
  if (params.category_code) sp.set('category_code', params.category_code);
  if (params.responsible_party) sp.set('responsible_party', params.responsible_party);
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  const qs = sp.toString();
  return request<PagedData<KnowledgeItem>>(`/${qs ? `?${qs}` : ''}`, undefined, params.authToken);
};

export const listCategories = (authToken?: string | null) =>
  request<KnowledgeCategory[]>('/categories', undefined, authToken);

export const getKnowledge = (id: number, authToken?: string | null) =>
  request<KnowledgeItem>(`/${id}`, undefined, authToken);

export const getKnowledgePages = (
  id: number,
  params: { page?: number; size?: number },
  authToken?: string | null,
) => {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  const qs = sp.toString();
  return request<PagedData<KnowledgePageItem>>(
    `/${id}/pages${qs ? `?${qs}` : ''}`,
    undefined,
    authToken,
  );
};
