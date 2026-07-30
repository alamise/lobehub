import { describe, expect, it } from 'vitest';

import { businessNavOfficeGroup } from './config';

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
});
