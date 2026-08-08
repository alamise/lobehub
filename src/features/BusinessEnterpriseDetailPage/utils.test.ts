import { describe, expect, it } from 'vitest';

import { parseEnterpriseArchiveHash } from './utils';

describe('parseEnterpriseArchiveHash', () => {
  it('解析纯数字锚点为档案 ID', () => {
    expect(parseEnterpriseArchiveHash('#12345')).toBe(12_345);
    expect(parseEnterpriseArchiveHash('12345')).toBe(12_345);
    expect(parseEnterpriseArchiveHash('  #42  ')).toBe(42);
  });

  it('忽略空值与非数字锚点', () => {
    expect(parseEnterpriseArchiveHash('')).toBeUndefined();
    expect(parseEnterpriseArchiveHash('#')).toBeUndefined();
    expect(parseEnterpriseArchiveHash('#archive=123')).toBeUndefined();
    expect(parseEnterpriseArchiveHash('#abc')).toBeUndefined();
    expect(parseEnterpriseArchiveHash('#12a')).toBeUndefined();
  });

  it('忽略非正整数锚点', () => {
    expect(parseEnterpriseArchiveHash('#0')).toBeUndefined();
    expect(parseEnterpriseArchiveHash('#-5')).toBeUndefined();
    expect(parseEnterpriseArchiveHash('#1.5')).toBeUndefined();
  });
});
