import { SYSTEM_DEFAULT_ROLES } from '@lobechat/const/rbac';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { roles, userRoles, users } from '@/database/schemas';
import type { LobeChatDatabase } from '@/database/type';

const DEFAULT_SYSTEM_ADMIN_EMAILS = ['31330362@qq.com'];

const parseList = (value?: string): string[] =>
  (value ?? '')
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizedEmailSet = () =>
  new Set(
    [...DEFAULT_SYSTEM_ADMIN_EMAILS, ...parseList(process.env.LOBE_SYSTEM_ADMIN_EMAILS)]
      .map((email) => email.toLowerCase())
      .filter(Boolean),
  );

const adminUserIdSet = () => new Set(parseList(process.env.LOBE_SYSTEM_ADMIN_USER_IDS));

export const isSystemAdminUser = async (
  db: LobeChatDatabase,
  userId: string | null | undefined,
): Promise<boolean> => {
  if (!userId) return false;
  if (adminUserIdSet().has(userId)) return true;

  const user = await db.query.users.findFirst({
    columns: { email: true, normalizedEmail: true, role: true },
    where: eq(users.id, userId),
  });

  const role = user?.role?.toLowerCase();
  if (role === 'admin' || role === SYSTEM_DEFAULT_ROLES.SUPER_ADMIN) return true;

  const emails = normalizedEmailSet();
  const email = user?.normalizedEmail || user?.email;
  if (email && emails.has(email.toLowerCase())) return true;

  const globalRole = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        isNull(userRoles.workspaceId),
        eq(roles.name, SYSTEM_DEFAULT_ROLES.SUPER_ADMIN),
        eq(roles.isActive, true),
        sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
      ),
    )
    .limit(1);

  return globalRole.length > 0;
};
