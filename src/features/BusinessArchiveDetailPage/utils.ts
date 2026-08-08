export const parseArchivePageHash = (hash: string): number | undefined => {
  const normalized = hash.trim().replace(/^#/, '');
  if (!normalized) return undefined;

  const searchParams = new URLSearchParams(normalized);
  const pageNum =
    searchParams.get('pageNum') || searchParams.get('page') || normalized.match(/^p(\d+)$/i)?.[1];
  const value = Number.parseInt(pageNum || '', 10);

  return Number.isFinite(value) && value > 0 ? value : undefined;
};
