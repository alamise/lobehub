import { describe, expect, it } from 'vitest';

import { buildBusinessContext, isCurrentArchiveReferenceHref } from './utils';

describe('buildBusinessContext', () => {
  it('accepts only safe positive integer ids', () => {
    expect(buildBusinessContext('archive', '123')).toEqual({ archiveId: '123', kind: 'archive' });
    expect(buildBusinessContext('archive', '123abc')).toBeUndefined();
    expect(buildBusinessContext('archive', '0')).toBeUndefined();
    expect(buildBusinessContext('archive', '9007199254740992')).toBeUndefined();
  });
});

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
