import type { BusinessAgentContext } from '@lobechat/types';
import { TRPCError } from '@trpc/server';
import { Pool, type PoolClient } from 'pg';

const ENTERPRISE_ARCHIVE_SCOPE = 'ent';

let legacyPool: Pool | undefined;

const getLegacyDatabaseUrl = (): string | undefined => {
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

const getLegacyPool = () => {
  if (legacyPool) return legacyPool;

  const connectionString = getLegacyDatabaseUrl();
  if (!connectionString) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Legacy business database is not configured. Set CASE_ARCHIVE_DATABASE_URL or CASE_ARCHIVE_DB_*.',
    });
  }

  legacyPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: Number(process.env.CASE_ARCHIVE_DB_MAX_POOL || 10),
  });

  return legacyPool;
};

export const withLegacyClient = async <T>(fn: (client: PoolClient) => Promise<T>) => {
  const client = await getLegacyPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

const parseBusinessId = (value: string, label: string) => {
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid ${label}`,
    });
  }

  return id;
};

export const assertCanUseBusinessContext = async (businessContext?: BusinessAgentContext) => {
  if (!businessContext) return;

  if (businessContext.kind === 'archive') {
    const archiveId = parseBusinessId(businessContext.archiveId, 'archiveId');
    const exists = await withLegacyClient(async (client) => {
      const result = await client.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM file_archive
          WHERE id = $1 AND visible = $2 AND scope = $3
        ) AS exists`,
        [archiveId, 'yes', ENTERPRISE_ARCHIVE_SCOPE],
      );

      return result.rows[0]?.exists === true;
    });

    if (!exists) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '当前用户不可访问该档案或档案不存在',
      });
    }

    return;
  }

  const enterpriseId = parseBusinessId(businessContext.enterpriseId, 'enterpriseId');
  const exists = await withLegacyClient(async (client) => {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM co_polluter_enterprise
        WHERE id = $1 AND (deleted IS NULL OR deleted = 0)
      ) AS exists`,
      [enterpriseId],
    );

    return result.rows[0]?.exists === true;
  });

  if (!exists) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '当前用户不可访问该企业或企业不存在',
    });
  }
};
