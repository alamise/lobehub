import { ArchiveIdentifier } from '@lobechat/builtin-tool-archive';

import { withLegacyClient } from '@/server/routers/lambda/_helpers/businessContextGuard';

import { type ServerRuntimeRegistration } from './types';

// Archive rows in the legacy business DB are scoped to enterprise archives.
const ARCHIVE_SCOPE = 'ent';

const parseArchiveId = (value: string): number | undefined => {
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) return undefined;
  return id;
};

export const archiveRuntime: ServerRuntimeRegistration = {
  factory: (context) => {
    // 临时诊断：确认运行时是否真的拿到 businessContext（上次调研未决点）。
    // 确认正常后移除本行。
    console.error('[archive-runtime] factory invoked, businessContext=', context.businessContext);

    const businessContext = context.businessContext;

    return {
      // 注意：方法名必须与 manifest 声明的 api.name 完全一致
      // （builtin.ts 按 runtime[apiName] 直接取方法），否则会走 UNKNOWN_API 报错分支。
      get_current_archive: async () => {
        // The panel only renders this tool inside an archive-scoped conversation,
        // but guard anyway so the model gets a clear message instead of a crash.
        if (!businessContext || businessContext.kind !== 'archive') {
          return {
            content:
              '当前对话未关联到具体档案上下文，无法获取档案信息。请在与某个档案绑定的对话中使用本工具。',
            success: false,
          };
        }

        const archiveId = parseArchiveId(businessContext.archiveId);
        if (!archiveId) {
          return {
            content: `当前档案 id 非法：${businessContext.archiveId}`,
            success: false,
          };
        }

        const row = await withLegacyClient(async (client) => {
          const result = await client.query<{
            id: number;
            title: string | null;
            doc_no: string | null;
            year: number | null;
            page_count: number | null;
            category_code: string | null;
            company_id: number | null;
          }>(
            `SELECT id, title, doc_no, year, page_count, category_code, company_id
             FROM file_archive
             WHERE id = $1 AND visible = $2 AND scope = $3
             LIMIT 1`,
            [archiveId, 'yes', ARCHIVE_SCOPE],
          );

          return result.rows[0];
        });

        if (!row) {
          return {
            content: `未找到 id 为 ${archiveId} 的可见档案`,
            success: false,
          };
        }

        const payload = {
          archive_id: row.id,
          title: row.title,
          doc_no: row.doc_no,
          year: row.year,
          page_count: row.page_count,
          category_code: row.category_code,
          company_id: row.company_id,
          kind: 'archive' as const,
        };

        return {
          content: JSON.stringify(payload, null, 2),
          success: true,
        };
      },
    };
  },
  identifier: ArchiveIdentifier,
};
