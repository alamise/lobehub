// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assertCanUseBusinessContext } from './businessContextGuard';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: mocks.connect,
  })),
}));

describe('assertCanUseBusinessContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CASE_ARCHIVE_DATABASE_URL = 'postgres://user:pass@localhost:5432/business';
    mocks.connect.mockResolvedValue({
      query: mocks.query,
      release: mocks.release,
    });
    mocks.query.mockResolvedValue({ rows: [{ exists: true }] });
  });

  it('is a no-op without business context', async () => {
    await assertCanUseBusinessContext();

    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('checks archive visibility and enterprise archive scope', async () => {
    await assertCanUseBusinessContext({ archiveId: '123', kind: 'archive' });

    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('FROM file_archive'), [
      123,
      'yes',
      'ent',
    ]);
    expect(mocks.release).toHaveBeenCalled();
  });

  it('checks enterprise existence and not-deleted status', async () => {
    await assertCanUseBusinessContext({ enterpriseId: '456', kind: 'enterprise' });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM co_polluter_enterprise'),
      [456],
    );
    expect(mocks.release).toHaveBeenCalled();
  });

  it('rejects invalid ids before querying', async () => {
    await expect(
      assertCanUseBusinessContext({ archiveId: 'not-a-number', kind: 'archive' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('rejects missing archive rows', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

    await expect(
      assertCanUseBusinessContext({ archiveId: '123', kind: 'archive' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects missing enterprise rows', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ exists: false }] });

    await expect(
      assertCanUseBusinessContext({ enterpriseId: '456', kind: 'enterprise' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
