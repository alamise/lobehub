/**
 * Business Archive Info — client-side executor.
 *
 * This tool MUST run in the browser: the archive id lives in the page URL
 * (e.g. `/enforcement/archive/224195`) and the server has no access to it.
 * The manifest declares `executors: ['client']`, so in a web deployment
 * without a device gateway the server dispatches the call to the renderer
 * over the Agent Gateway WS and this executor reads `window.location`.
 */
import { ArchiveApiName, ArchiveIdentifier } from '@lobechat/builtin-tool-archive';
import type { BuiltinToolContext, BuiltinToolResult, IBuiltinToolExecutor } from '@lobechat/types';

/**
 * Extract the numeric archive id from a pathname.
 * Supports `/enforcement/archive/224195` and a bare `/archive/224195`.
 */
const extractArchiveId = (pathname: string): string | undefined => {
  const matched =
    pathname.match(/\/enforcement\/archive\/(\d+)/) ?? pathname.match(/\/archive\/(\d+)/);
  return matched?.[1];
};

class ArchiveInfoExecutor implements IBuiltinToolExecutor {
  readonly identifier = ArchiveIdentifier;

  getApiNames = (): string[] => [ArchiveApiName.getArchiveInfo];

  hasApi = (apiName: string): boolean => apiName === ArchiveApiName.getArchiveInfo;

  invoke = async (
    apiName: string,
    _params: unknown,
    _ctx: BuiltinToolContext,
  ): Promise<BuiltinToolResult> => {
    if (apiName !== ArchiveApiName.getArchiveInfo) {
      return { content: `Unsupported API: ${apiName}`, success: false };
    }

    if (typeof window === 'undefined' || !window.location) {
      return {
        content: '当前运行环境无法访问浏览器地址，无法从 URL 读取档案 id。',
        success: false,
      };
    }

    const { pathname, href } = window.location;
    const archiveId = extractArchiveId(pathname);

    if (!archiveId) {
      return {
        content:
          '未能从当前页面 URL 解析出档案 id。请确认正在打开的页面是档案详情页（URL 形如 /enforcement/archive/<id>）。',
        success: false,
      };
    }

    const payload = {
      archive_id: archiveId,
      kind: 'archive' as const,
      source: 'url',
      url: href,
    };

    return {
      content: JSON.stringify(payload, null, 2),
      success: true,
    };
  };
}

export const archiveInfoExecutor = new ArchiveInfoExecutor();
