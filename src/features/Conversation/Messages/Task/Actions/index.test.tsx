/**
 * @vitest-environment happy-dom
 */
import type { UIChatMessage } from '@lobechat/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssistantActionsBar } from './index';

vi.mock('../../components/MessageActionBar', () => ({
  MessageActionBar: ({ bar, menu }: { bar?: string[]; menu?: string[] }) => (
    <div
      data-bar={(bar ?? []).join(',')}
      data-menu={(menu ?? []).join(',')}
      data-testid="action-bar"
    />
  ),
}));

describe('Task AssistantActionsBar', () => {
  it('includes tts in the default historical task message menu', () => {
    render(
      <AssistantActionsBar
        data={{ content: 'hello', role: 'assistant', tools: [] } as unknown as UIChatMessage}
        id="task-message-1"
      />,
    );

    const bar = screen.getByTestId('action-bar');
    expect(bar.getAttribute('data-menu')?.split(',')).toContain('tts');
  });
});
