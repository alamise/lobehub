import type { Session } from '@/libs/better-auth/auth-client';

const FORMAT_API_BASE = '/api/v1/ai-document-format';

const getToken = (session?: Session | null): string | null =>
  (session as { accessToken?: string } | null)?.accessToken ?? null;

const authHeaders = (token?: string | null) => (token ? { Authorization: `Bearer ${token}` } : {});

export const formatDocument = async (
  file: File,
  session?: Session | null,
): Promise<Blob> => {
  const token = getToken(session);
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${FORMAT_API_BASE}/`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body: form,
  });
  if (!response.ok) {
    try {
      const err = (await response.json()) as { error?: string; msg?: string };
      throw new Error(err.msg || err.error || `HTTP ${response.status}`);
    } catch {
      throw new Error(`HTTP ${response.status}`);
    }
  }
  return response.blob();
};
