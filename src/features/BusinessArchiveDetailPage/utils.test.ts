import { describe, expect, it } from 'vitest';

import { parseArchivePageHash } from './utils';

describe('BusinessArchiveDetailPage utils', () => {
  it('parses supported archive page hash formats', () => {
    expect(parseArchivePageHash('#pageNum=7')).toBe(7);
    expect(parseArchivePageHash('#page=8')).toBe(8);
    expect(parseArchivePageHash('#p9')).toBe(9);
  });

  it('ignores invalid archive page hashes', () => {
    expect(parseArchivePageHash('')).toBeUndefined();
    expect(parseArchivePageHash('#pageNum=0')).toBeUndefined();
    expect(parseArchivePageHash('#section=summary')).toBeUndefined();
  });
});
