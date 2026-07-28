import { inArray, or, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { buildWorkspaceWhere } from './workspace';

const DEFAULT_GLOBAL_SHARED_AGENT_IDS = 'agt_J8tHPinLzsfP';

export const getGlobalSharedAgentIds = (): string[] => {
  const raw =
    process.env.LOBE_GLOBAL_SHARED_AGENT_IDS ||
    process.env.GLOBAL_SHARED_AGENT_IDS ||
    DEFAULT_GLOBAL_SHARED_AGENT_IDS;
  if (!raw) return [];

  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
};

export const isGlobalSharedAgentId = (id?: string | null): boolean =>
  !!id && getGlobalSharedAgentIds().includes(id);

export const globalSharedAgentWhere = (agentIdColumn: AnyPgColumn): SQL | undefined => {
  const ids = getGlobalSharedAgentIds();
  return ids.length > 0 ? inArray(agentIdColumn, ids) : undefined;
};

export const buildReadableAgentWhere = (
  ctx: { userId: string; workspaceId?: string },
  cols: {
    id: AnyPgColumn;
    userId: AnyPgColumn;
    visibility?: AnyPgColumn;
    workspaceId: AnyPgColumn;
  },
): SQL => {
  const scopedWhere = buildWorkspaceWhere(ctx, cols);
  const sharedWhere = globalSharedAgentWhere(cols.id);

  return sharedWhere ? (or(scopedWhere, sharedWhere) as SQL) : scopedWhere;
};
