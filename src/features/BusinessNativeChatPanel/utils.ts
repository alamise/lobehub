import type { BusinessAgentContext } from '@lobechat/types';

export type BusinessAgentKind = BusinessAgentContext['kind'];

/**
 * Topic pointer storage key. Deliberately identical to the key the legacy
 * self-built panel used, so existing conversations stay reachable after the
 * panel is swapped for the native one.
 */
const TOPIC_PREFIX = 'business-agent-topic';

export const buildTopicStorageKey = (kind: BusinessAgentKind, contextId: string) =>
  `${TOPIC_PREFIX}:${kind}:${contextId}`;

export const buildBusinessContext = (
  kind: BusinessAgentKind,
  contextId: string,
): BusinessAgentContext | undefined => {
  if (!contextId) return undefined;

  return kind === 'archive'
    ? { archiveId: contextId, kind: 'archive' }
    : { enterpriseId: contextId, kind: 'enterprise' };
};

const hasPageHash = (hash: string) =>
  /^#(?:pageNum|page)=\d+$/i.test(hash) || /^#p\d+$/i.test(hash);

const hasPageSearch = (search: string) => {
  const pageNum = new URLSearchParams(search).get('pageNum');
  const value = Number.parseInt(pageNum || '', 10);
  return Number.isFinite(value) && value > 0;
};

/**
 * Whether an anchor href points at a specific page of the archive currently
 * open in the left preview pane. Such references are intercepted and resolved
 * in-place (jump the viewer to that page) instead of navigating away.
 */
export const isCurrentArchiveReferenceHref = (href: string | undefined, contextId: string) => {
  const value = href?.trim();
  if (!value || !contextId) return false;
  if (hasPageHash(value)) return true;
  if (value.startsWith('?') && hasPageSearch(value)) return true;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) || value.startsWith('//')) return false;

  try {
    const url = new URL(value, 'https://lobe.local');
    return (
      url.pathname === `/enforcement/archive/${contextId}` &&
      (hasPageSearch(url.search) || hasPageHash(url.hash))
    );
  } catch {
    return false;
  }
};
