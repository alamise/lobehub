import { HTTPException } from 'hono/http-exception';
import { Pool, type PoolClient } from 'pg';
import { auth } from '@/auth';
import type { Context, Next } from 'hono';

// Shared helpers for the legacy Postgres (`cyan`) business tables.
// The case-archives route already proved this connection pattern works; the
// other business features (ent/company/emergency/eia/...) all live in the same
// database, so they reuse the exact same connection string env vars.

let pool: Pool | undefined;

const getDatabaseUrl = (): string | undefined => {
  if (process.env.CASE_ARCHIVE_DATABASE_URL) return process.env.CASE_ARCHIVE_DATABASE_URL;

  const host = process.env.CASE_ARCHIVE_DB_HOST;
  const port = process.env.CASE_ARCHIVE_DB_PORT || '5432';
  const database = process.env.CASE_ARCHIVE_DB_NAME;
  const user = process.env.CASE_ARCHIVE_DB_USER;
  const password = process.env.CASE_ARCHIVE_DB_PASSWORD;

  if (!host || !database || !user || !password) return;

  const params = new URLSearchParams({
    sslmode: process.env.CASE_ARCHIVE_DB_SSLMODE || 'disable',
  });
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?${params}`;
};

export const getLegacyPool = (): Pool => {
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new HTTPException(500, {
      message:
        'Legacy business database is not configured. Set CASE_ARCHIVE_DATABASE_URL or CASE_ARCHIVE_DB_*.',
    });
  }

  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: Number(process.env.CASE_ARCHIVE_DB_MAX_POOL || 10),
  });
  pool.on('error', (error) => {
    console.error('[legacyDb] idle database client error:', error);
  });

  return pool;
};

export const requireLobeSession = async (c: Context, next: Next) => {
  if (c.get('userId')) return next();

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  c.set('userId', session.user.id);
  c.set('authType', 'better-auth');

  return next();
};

export const success = <T>(c: Context, data: T) =>
  c.json({
    code: 200,
    data,
    msg: 'success',
  });

export const toPositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const normalizeSize = (value: string | null): number =>
  Math.min(toPositiveInt(value, 20), 100);

export const escapeLike = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

export const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getLegacyPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};
