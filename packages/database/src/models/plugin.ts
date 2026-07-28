import type { LobeTool } from '@lobechat/types';
import { and, desc, eq, sql } from 'drizzle-orm';

import type { InstalledPluginItem, NewInstalledPlugin } from '../schemas';
import { userInstalledPlugins } from '../schemas';
import type { LobeChatDatabase } from '../type';
import { buildWorkspaceWhere } from '../utils/workspace';

export interface PluginQueryOptions {
  sharedOnly?: boolean;
}

const sharedPluginPredicate = sql<boolean>`coalesce((${userInstalledPlugins.customParams} ->> 'yuxiaohuanGlobalShared')::boolean, false)`;
const GLOBAL_SHARED_MARK = 'yuxiaohuanGlobalShared';

export class PluginModel {
  private userId: string;
  private db: LobeChatDatabase;
  private workspaceId?: string;

  constructor(db: LobeChatDatabase, userId: string, workspaceId?: string) {
    this.userId = userId;
    this.db = db;
    this.workspaceId = workspaceId;
  }

  private ownership = () =>
    buildWorkspaceWhere(
      { userId: this.userId, workspaceId: this.workspaceId },
      userInstalledPlugins,
    );

  private queryWhere = (options: PluginQueryOptions = {}) =>
    options.sharedOnly ? and(this.ownership(), sharedPluginPredicate) : this.ownership();

  create = async (
    params: Pick<
      NewInstalledPlugin,
      'type' | 'identifier' | 'manifest' | 'customParams' | 'settings' | 'source'
    >,
  ) => {
    const [result] = await this.db
      .insert(userInstalledPlugins)
      .values({
        ...params,
        userId: this.userId,
        workspaceId: this.workspaceId ?? null,
      })
      .onConflictDoUpdate({
        set: { ...params, updatedAt: new Date() },
        target: [userInstalledPlugins.identifier, userInstalledPlugins.userId],
      })
      .returning();

    return result;
  };

  delete = async (id: string) => {
    return this.db
      .delete(userInstalledPlugins)
      .where(and(eq(userInstalledPlugins.identifier, id), this.ownership()));
  };

  deleteAll = async () => {
    return this.db.delete(userInstalledPlugins).where(this.ownership());
  };

  query = async () => {
    const data = await this.db
      .select({
        createdAt: userInstalledPlugins.createdAt,
        customParams: userInstalledPlugins.customParams,
        identifier: userInstalledPlugins.identifier,
        manifest: userInstalledPlugins.manifest,
        settings: userInstalledPlugins.settings,
        source: userInstalledPlugins.type,
        type: userInstalledPlugins.type,
        updatedAt: userInstalledPlugins.updatedAt,
      })
      .from(userInstalledPlugins)
      .where(this.queryWhere())
      .orderBy(desc(userInstalledPlugins.createdAt));

    return data.map<LobeTool>((item) => ({
      ...item,
      runtimeType: item.manifest?.type || 'default',
    }));
  };

  queryShared = async () => {
    const data = await this.db
      .select({
        createdAt: userInstalledPlugins.createdAt,
        customParams: userInstalledPlugins.customParams,
        identifier: userInstalledPlugins.identifier,
        manifest: userInstalledPlugins.manifest,
        settings: userInstalledPlugins.settings,
        source: userInstalledPlugins.type,
        type: userInstalledPlugins.type,
        updatedAt: userInstalledPlugins.updatedAt,
      })
      .from(userInstalledPlugins)
      .where(this.queryWhere({ sharedOnly: true }))
      .orderBy(desc(userInstalledPlugins.createdAt));

    return data.map<LobeTool>((item) => ({
      ...item,
      runtimeType: item.manifest?.type || 'default',
    }));
  };

  findById = async (id: string) => {
    return this.db.query.userInstalledPlugins.findFirst({
      where: and(eq(userInstalledPlugins.identifier, id), this.ownership()),
    });
  };

  findSharedById = async (id: string) => {
    return this.db.query.userInstalledPlugins.findFirst({
      where: and(eq(userInstalledPlugins.identifier, id), this.queryWhere({ sharedOnly: true })),
    });
  };

  update = async (id: string, value: Partial<InstalledPluginItem>) => {
    return this.db
      .update(userInstalledPlugins)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(userInstalledPlugins.identifier, id), this.ownership()));
  };

  setGlobalShared = async (id: string, shared: boolean) => {
    const existing = await this.findById(id);
    if (!existing) return;

    return this.update(id, {
      customParams: {
        ...((existing.customParams ?? {}) as Record<string, unknown>),
        [GLOBAL_SHARED_MARK]: shared,
      } as InstalledPluginItem['customParams'],
    });
  };
}
