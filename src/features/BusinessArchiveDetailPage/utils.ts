/**
 * 触发浏览器原生下载。
 * 下载地址是同源接口（依赖 better-auth 会话 Cookie 鉴权），
 * 用 <a download> 直接导航而不是 fetch → blob，避免大体积 PDF 占用内存。
 */
export const triggerBrowserDownload = (url: string, fileName?: string) => {
  if (typeof document === 'undefined' || !url) return;

  const anchor = document.createElement('a');
  anchor.href = url;
  if (fileName) anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

export const parseArchivePageHash = (hash: string): number | undefined => {
  const normalized = hash.trim().replace(/^#/, '');
  if (!normalized) return undefined;

  const searchParams = new URLSearchParams(normalized);
  const pageNum =
    searchParams.get('pageNum') || searchParams.get('page') || normalized.match(/^p(\d+)$/i)?.[1];
  const value = Number.parseInt(pageNum || '', 10);

  return Number.isFinite(value) && value > 0 ? value : undefined;
};
