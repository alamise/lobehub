import { describe, expect, it } from 'vitest';

import { isCurrentArchiveReferenceHref } from './utils';

describe('isCurrentArchiveReferenceHref', () => {
  it('detects current archive reference links', () => {
    expect(isCurrentArchiveReferenceHref('/enforcement/archive/74929#pageNum=7', '74929')).toBe(
      true,
    );
    expect(isCurrentArchiveReferenceHref('/enforcement/archive/74929?pageNum=7', '74929')).toBe(
      true,
    );
    expect(isCurrentArchiveReferenceHref('?pageNum=7', '74929')).toBe(true);
    expect(isCurrentArchiveReferenceHref('#p7', '74929')).toBe(true);
    expect(isCurrentArchiveReferenceHref('/enforcement/archive/1#pageNum=7', '74929')).toBe(false);
    expect(isCurrentArchiveReferenceHref('https://example.com/doc#pageNum=7', '74929')).toBe(false);
    expect(
      isCurrentArchiveReferenceHref(
        'https://lobe.local/enforcement/archive/74929#pageNum=7',
        '74929',
      ),
    ).toBe(false);
  });
});
