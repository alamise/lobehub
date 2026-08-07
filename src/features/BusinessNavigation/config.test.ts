import { describe, expect, it } from 'vitest';

import { businessNavOfficeGroup, businessNavTopItems } from './config';

describe('businessNavOfficeGroup', () => {
  it('opens the native page editor from the document-format entry', () => {
    const documentFormatItem = businessNavOfficeGroup.items.find(
      (item) => item.key === 'office-document-format',
    );

    expect(documentFormatItem).toMatchObject({
      path: '/page',
      title: '公文格式调整',
    });
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
