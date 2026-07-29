import { createRequire } from 'node:module';
import { promisify } from 'node:util';

import type {
  ITracingStore,
  SaveResult,
  TracingPayload,
  TracingSummary,
} from '@lobechat/llm-generation-tracing';
import debug from 'debug';

import { FileS3 } from '@/server/modules/S3';

// Turbopack 的 CJS 词法分析器无法静态识别 node:zlib 上 zstd* 这类惰性 getter 的
// 具名导出，导致具名 import 得到 undefined。改为运行时 require 取实体。
const require = createRequire(import.meta.url);
const zlib = require('node:zlib');

const compressZstd = zlib.zstdCompress ? promisify(zlib.zstdCompress) : null;
const decompressZstd = zlib.zstdDecompress ? promisify(zlib.zstdDecompress) : null;

const log = debug('lobe-server:llm-generation-tracing:s3');

const TRACE_PREFIX = 'llm-generation-tracing';
const PAYLOAD_SUFFIX = '.json.zst';
const ZSTD_CONTENT_TYPE = 'application/zstd';

const sanitize = (value: string): string => value.replaceAll(/[^\w.-]+/g, '_') || 'unknown';

const dateSegment = (createdAt: number): string => new Date(createdAt).toISOString().slice(0, 10);

/**
 * Canonical S3 key for a tracing payload. Same source of truth used by both
 * the store's `save()` and the DB row's `storage_key` so the value persisted
 * in `llm_generation_tracing.storage_key` always matches the object in S3.
 *
 * Layout:
 *   llm-generation-tracing/{scenario}/{promptVersion}-{promptHash}/{yyyy-mm-dd}/{tracingId}.json.zst
 */
export const buildTracingKey = (record: {
  created_at: number;
  prompt_hash: string;
  prompt_version: string;
  scenario: string;
  tracing_id: string;
}): string =>
  [
    TRACE_PREFIX,
    sanitize(record.scenario),
    `${sanitize(record.prompt_version)}-${sanitize(record.prompt_hash)}`,
    dateSegment(record.created_at),
    `${sanitize(record.tracing_id)}${PAYLOAD_SUFFIX}`,
  ].join('/');

/**
 * S3-backed store for per-call llm_generation_tracing payloads.
 *
 * Payload is zstd-compressed (level 3) prior to upload; the `.zst` suffix
 * advertises the format but Content-Encoding is intentionally omitted to keep
 * the object opaque to HTTP middleware (callers decompress explicitly).
 *
 * Query (`get` / `list`) is left intentionally minimal — analytics queries go
 * against the DB row; the S3 blob is the cold artefact for offline review.
 */
export class S3TracingStore implements ITracingStore {
  private readonly s3: FileS3;

  constructor() {
    this.s3 = new FileS3();
  }

  async save(record: TracingPayload): Promise<SaveResult> {
    const key = buildTracingKey(record);
    log('Saving tracing payload to S3: %s', key);
    const compressed = await compressZstd(Buffer.from(JSON.stringify(record)));
    await this.s3.uploadBuffer(key, compressed, ZSTD_CONTENT_TYPE);
    return { key };
  }

  async get(key: string): Promise<TracingPayload | null> {
    try {
      const bytes = await this.s3.getFileByteArray(key);
      const buf = await decompressZstd(Buffer.from(bytes));
      return JSON.parse(buf.toString('utf8')) as TracingPayload;
    } catch {
      return null;
    }
  }

  async list(_options?: { limit?: number }): Promise<TracingSummary[]> {
    return [];
  }
}
