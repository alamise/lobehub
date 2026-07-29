export interface ArchiveCategory {
  code: string;
  description?: string | null;
  name: string;
}

export interface AiArchiveItem {
  ai_guide?: string;
  category_code?: string;
  category_name?: string;
  company_id?: number | null;
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

export interface PagedData<T> {
  list: T[];
  page: number;
  size: number;
  total: number;
}

type ApiEnvelope<T> = {
  code: number;
  data: T;
  msg?: string;
};

const ARCHIVE_API_BASE = '/api/v1/ai-archive';

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
  const response = await fetch(`${ARCHIVE_API_BASE}${path}`, {
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

export const getAiArchives = (params: {
  authToken?: string | null;
  category_code?: string;
  category_prefix?: string;
  order?: 'asc' | 'desc';
  page?: number;
  search?: string;
  size?: number;
  sort?: string;
  title?: string;
  doc_no?: string;
  year?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);
  if (params.search) searchParams.set('search', params.search);
  if (params.title) searchParams.set('title', params.title);
  if (params.doc_no) searchParams.set('doc_no', params.doc_no);
  if (params.year) searchParams.set('year', params.year);
  if (params.category_code) searchParams.set('category_code', params.category_code);
  if (params.category_prefix) searchParams.set('category_prefix', params.category_prefix);
  const query = searchParams.toString();
  return request<PagedData<AiArchiveItem>>(`/${query ? `?${query}` : ''}`, undefined, params.authToken);
};

export const getAiArchive = (id: number, authToken?: string | null) =>
  request<AiArchiveItem>(`/${id}`, undefined, authToken);

export const getArchiveCategories = (authToken?: string | null) =>
  request<ArchiveCategory[]>('/categories', undefined, authToken);

export interface ArchivePageItem {
  content: string;
  file_name: string;
  id: number;
  page_num: number;
  parse_status: string;
}

export const getArchivePages = (
  id: number,
  params: { page?: number; size?: number },
  authToken?: string | null,
) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.size) searchParams.set('size', String(params.size));
  const query = searchParams.toString();
  return request<PagedData<ArchivePageItem>>(
    `/${id}/pages${query ? `?${query}` : ''}`,
    undefined,
    authToken,
  );
};
