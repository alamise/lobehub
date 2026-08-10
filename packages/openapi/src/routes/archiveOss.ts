import { createHmac } from 'node:crypto';

import { HTTPException } from 'hono/http-exception';

// ---------------------------------------------------------------------------
// 档案 OSS 资源访问（图片 + 原始 PDF）
//
// 旧版 Go 服务通过 OSS SDK 直接读取 file_archive.oss_hit_first_path 指向的原始
// PDF（download_handler.go → oss.ParseOSSPath + oss.GetObject），页面切图则以
// public-read 上传。迁移到 LobeHub 后：
//   - 页面切图仍走公开 endpoint 直读；
//   - 原始 PDF 在 OSS 上不是公共读（匿名访问 403），必须用 AK/SK 生成 V1 签名
//     URL，再由服务端流式中转，避免把密钥或直链暴露给浏览器。
// ---------------------------------------------------------------------------

const DEFAULT_PUBLIC_ENDPOINT = 'http://183.134.109.225:8010';
const DEFAULT_BUCKET = 'yhqhbai-data';
const DEFAULT_SIGNED_URL_TTL = 300;

export const ARCHIVE_OSS_PUBLIC_ENDPOINT =
  process.env.ARCHIVE_OSS_PUBLIC_ENDPOINT ||
  process.env.LEGACY_OSS_PUBLIC_ENDPOINT ||
  DEFAULT_PUBLIC_ENDPOINT;

const ARCHIVE_OSS_BUCKET =
  process.env.ARCHIVE_OSS_BUCKET || process.env.LEGACY_OSS_BUCKET || DEFAULT_BUCKET;

const ARCHIVE_OSS_ACCESS_KEY_ID =
  process.env.ARCHIVE_OSS_ACCESS_KEY_ID || process.env.LEGACY_OSS_ACCESS_KEY_ID || '';

const ARCHIVE_OSS_ACCESS_KEY_SECRET =
  process.env.ARCHIVE_OSS_ACCESS_KEY_SECRET || process.env.LEGACY_OSS_ACCESS_KEY_SECRET || '';

const SIGNED_URL_TTL_SECONDS =
  Number.parseInt(process.env.ARCHIVE_OSS_SIGNED_URL_TTL || '', 10) || DEFAULT_SIGNED_URL_TTL;

export const IMAGE_CACHE_MAX_AGE = 60 * 60 * 24;

interface ParsedOssPath {
  bucket: string;
  key: string;
}

/** 解析 oss://bucket/key，兼容裸 key（对齐旧版 oss.NormalizeKey） */
export const parseOssPath = (ossPath: string): ParsedOssPath | undefined => {
  if (!ossPath) return undefined;
  if (!ossPath.toLowerCase().startsWith('oss://')) {
    return { bucket: '', key: ossPath.replace(/^\/+/, '') };
  }

  const path = ossPath.slice('oss://'.length);
  const separatorIndex = path.indexOf('/');
  if (separatorIndex < 0) return undefined;

  return {
    bucket: path.slice(0, separatorIndex),
    key: path.slice(separatorIndex + 1),
  };
};

export const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

/** 页面切图直读地址（public-read 对象） */
export const buildOssObjectUrl = (ossPath: string, type: 'image' | 'thumbnail') => {
  const parsed = parseOssPath(ossPath);
  if (!parsed?.key) return '';

  const base = ARCHIVE_OSS_PUBLIC_ENDPOINT.replace(/\/$/, '');
  const path = parsed.bucket
    ? `${encodeURIComponent(parsed.bucket)}/${encodePath(parsed.key)}`
    : encodePath(parsed.key);
  const url = new URL(`${base}/${path}`);
  if (type === 'thumbnail') url.searchParams.set('x-oss-process', 'image/resize,w_300');

  return url.toString();
};

export const getImageContentType = (path: string, fallback?: string | null) => {
  if (fallback?.startsWith('image/')) return fallback;
  const suffix = path.split('?')[0]?.split('.').pop()?.toLowerCase();
  switch (suffix) {
    case 'gif': {
      return 'image/gif';
    }
    case 'png': {
      return 'image/png';
    }
    case 'webp': {
      return 'image/webp';
    }
    default: {
      return 'image/jpeg';
    }
  }
};

export const isArchiveOssSignConfigured = () =>
  Boolean(ARCHIVE_OSS_ACCESS_KEY_ID && ARCHIVE_OSS_ACCESS_KEY_SECRET);

/**
 * 生成 OSS V1 临时签名 URL。
 * StringToSign = "GET\n\n\n{Expires}\n/{bucket}/{key}"
 */
export const buildSignedOssUrl = (ossPath: string, ttlSeconds = SIGNED_URL_TTL_SECONDS) => {
  const parsed = parseOssPath(ossPath);
  if (!parsed?.key) return '';
  if (!isArchiveOssSignConfigured()) return '';

  const bucket = parsed.bucket || ARCHIVE_OSS_BUCKET;
  if (!bucket) return '';

  const expires = Math.floor(Date.now() / 1000) + Math.max(ttlSeconds, 60);
  const stringToSign = `GET\n\n\n${expires}\n/${bucket}/${parsed.key}`;
  const signature = createHmac('sha1', ARCHIVE_OSS_ACCESS_KEY_SECRET)
    .update(stringToSign, 'utf8')
    .digest('base64');

  const base = ARCHIVE_OSS_PUBLIC_ENDPOINT.replace(/\/$/, '');
  const url = new URL(`${base}/${encodeURIComponent(bucket)}/${encodePath(parsed.key)}`);
  url.searchParams.set('OSSAccessKeyId', ARCHIVE_OSS_ACCESS_KEY_ID);
  url.searchParams.set('Expires', String(expires));
  url.searchParams.set('Signature', signature);

  return url.toString();
};

const sanitizeFileName = (value: string) =>
  value
    .replaceAll(/[/\\]/g, '_')
    .replaceAll(/["\r\n\t]/g, '_')
    .trim();

const getOssFileExtension = (ossPath: string) => {
  const key = parseOssPath(ossPath)?.key || '';
  const suffix = key.split('/').pop()?.split('.').pop()?.toLowerCase() || '';
  return suffix && suffix.length <= 5 && /^[a-z\d]+$/.test(suffix) ? `.${suffix}` : '.pdf';
};

/** 与旧版 archiveDownloadFilename 对齐：附件名 → 标题 → archive-{id} */
export const buildArchiveDownloadFileName = (options: {
  annexName?: string | null;
  id: number;
  ossPath: string;
  title?: string | null;
}) => {
  const extension = getOssFileExtension(options.ossPath);

  for (const candidate of [options.annexName, options.title]) {
    const name = sanitizeFileName(candidate || '');
    if (!name || name === '.' || name === '..') continue;
    return name.toLowerCase().endsWith(extension) ? name : `${name}${extension}`;
  }

  return `archive-${options.id}${extension}`;
};

export const buildContentDisposition = (fileName: string) => {
  const extension = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '.pdf';
  const asciiOnly = /^[\u0020-\u007E]+$/.test(fileName);
  const ascii = asciiOnly ? fileName : `download${extension}`;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

const getDownloadContentType = (ossPath: string, fallback?: string | null) => {
  if (fallback && !fallback.startsWith('text/html')) return fallback;
  return getOssFileExtension(ossPath) === '.pdf' ? 'application/pdf' : 'application/octet-stream';
};

/**
 * 服务端中转下载原始档案文件（流式转发，避免大文件占用内存）。
 */
export const createArchiveFileResponse = async (ossPath: string, fileName: string) => {
  if (!isArchiveOssSignConfigured()) {
    throw new HTTPException(500, {
      message:
        '档案原件下载未配置：请设置 ARCHIVE_OSS_ACCESS_KEY_ID / ARCHIVE_OSS_ACCESS_KEY_SECRET',
    });
  }

  const signedUrl = buildSignedOssUrl(ossPath);
  if (!signedUrl) throw new HTTPException(400, { message: '无效的档案文件路径' });

  const upstream = await fetch(signedUrl);
  if (!upstream.ok || !upstream.body) {
    throw new HTTPException(502, { message: `读取档案文件失败 (${upstream.status})` });
  }

  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Disposition': buildContentDisposition(fileName),
    'Content-Type': getDownloadContentType(ossPath, upstream.headers.get('content-type')),
  });

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, { headers, status: 200 });
};
