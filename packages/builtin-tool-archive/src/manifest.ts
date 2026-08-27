import type { BuiltinToolManifest } from '@lobechat/types';

import { systemPrompt } from './systemRole';
import { ArchiveApiName } from './types';

export const ArchiveIdentifier = 'business-archive-info';

export const ArchiveManifest: BuiltinToolManifest = {
  api: [
    {
      description:
        '获取用户当前正在浏览的档案的 id 与基本信息（标题、文号、年份、页数等）。当用户针对"本档案 / 这份档案 / 当前档案"提问时，应先调用本工具拿到准确的档案 id，再把该 id 作为 archive_id 传给检索工具（如 document_archive_search）。无参数。',
      name: ArchiveApiName.getArchiveInfo,
      parameters: {
        properties: {},
        required: [],
        type: 'object',
      },
    },
  ],
  identifier: ArchiveIdentifier,
  // The server runtime reads the validated operation business context and the
  // authoritative archive database; the browser URL is not a trust boundary.
  executors: ['server'],
  meta: {
    avatar: '🗂️',
    description: '获取当前正在浏览的档案的 id 与基本信息',
    title: '当前档案信息',
  },
  systemRole: systemPrompt,
  type: 'builtin',
};
