export interface ArticleItem {
  content: string;
  crawled_at: string;
  created_at: string;
  es_sync_error: string;
  es_sync_status: string;
  id: number;
  published_at: string;
  source_name: string;
  source_url: string;
  title: string;
  updated_at: string;
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

const ARTICLES_API_BASE = '/api/v1/ai-articles';

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
  const response = await fetch(`${ARTICLES_API_BASE}${path}`, {
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

export const getArticles = (params: {
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
  return request<PagedData<ArticleItem>>(`/${query ? `?${query}` : ''}`, undefined, params.authToken);
};

export const getArticleById = (id: number, authToken?: string | null) =>
  request<ArticleItem>(`/${id}`, undefined, authToken);
