/**
 * @vitest-environment happy-dom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBuildActions } from './useBuildActions';

const accessMock = vi.hoisted(() => ({
  canUseResource: false,
}));

const actionStubs = vi.hoisted(() => ({
  branching: { useBuild: () => ({ key: 'branching' }) },
  collapse: { useBuild: () => ({ key: 'collapse' }) },
  continueGeneration: { useBuild: () => ({ key: 'continueGeneration' }) },
  copy: { useBuild: () => ({ key: 'copy' }) },
  del: { useBuild: () => ({ key: 'del' }) },
  delAndRegenerate: { useBuild: () => ({ key: 'delAndRegenerate' }) },
  edit: { useBuild: () => ({ key: 'edit' }) },
  regenerate: { useBuild: () => ({ key: 'regenerate' }) },
  restoreToInput: { useBuild: () => ({ key: 'restoreToInput' }) },
  select: { useBuild: () => ({ key: 'select' }) },
  share: { useBuild: () => ({ key: 'share' }) },
  translate: { useBuild: () => ({ key: 'translate' }) },
  tts: { useBuild: () => ({ key: 'tts' }) },
}));

vi.mock('../../../hooks/useConversationResourceAccess', () => ({
  useConversationResourceAccess: () => ({ canUseResource: accessMock.canUseResource }),
}));

vi.mock('./actions/branching', () => ({ branchingAction: actionStubs.branching }));
vi.mock('./actions/collapse', () => ({ collapseAction: actionStubs.collapse }));
vi.mock('./actions/continueGeneration', () => ({
  continueGenerationAction: actionStubs.continueGeneration,
}));
vi.mock('./actions/copy', () => ({ copyAction: actionStubs.copy }));
vi.mock('./actions/del', () => ({ delAction: actionStubs.del }));
vi.mock('./actions/delAndRegenerate', () => ({
  delAndRegenerateAction: actionStubs.delAndRegenerate,
}));
vi.mock('./actions/edit', () => ({ editAction: actionStubs.edit }));
vi.mock('./actions/regenerate', () => ({ regenerateAction: actionStubs.regenerate }));
vi.mock('./actions/restoreToInput', () => ({
  restoreToInputAction: actionStubs.restoreToInput,
}));
vi.mock('./actions/select', () => ({ selectAction: actionStubs.select }));
vi.mock('./actions/share', () => ({ shareAction: actionStubs.share }));
vi.mock('./actions/translate', () => ({ translateAction: actionStubs.translate }));
vi.mock('./actions/tts', () => ({ ttsAction: actionStubs.tts }));

describe('useBuildActions', () => {
  it('keeps tts available when the resource is view-only', () => {
    accessMock.canUseResource = false;

    const { result } = renderHook(() =>
      useBuildActions({
        data: { content: 'hello', role: 'assistant' } as any,
        id: 'message-1',
        role: 'assistant',
      }),
    );

    expect(result.current.tts).toEqual({ key: 'tts' });
    expect(result.current.edit).toBeNull();
    expect(result.current.regenerate).toBeNull();
  });
});
