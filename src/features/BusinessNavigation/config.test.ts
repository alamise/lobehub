import { describe, expect, it } from 'vitest';

import { businessNavOfficeGroup, businessNavTopItems } from './config';

describe('businessNavOfficeGroup', () => {
  it('resolves the document-format entry from agent config (no hardcoded path)', () => {
    const documentFormatItem = businessNavOfficeGroup.items.find(
      (item) => item.key === 'office-document-format',
    );

    expect(documentFormatItem).toBeDefined();
    expect(documentFormatItem).toMatchObject({
      key: 'office-document-format',
      title: '公文格式调整',
    });
    // 跳转路由改为运行时从 businessAgent.docFormatAgentId 解析，不再写死在配置中
    expect(documentFormatItem?.path).toBeUndefined();
  });

  it('exposes the admin-only agent management entry', () => {
    const agentManagementItem = businessNavTopItems.find((item) => item.key === 'agent-management');

    expect(agentManagementItem).toMatchObject({
      adminOnly: true,
      path: '/agents',
      title: '智能体管理',
    });
  });
});
