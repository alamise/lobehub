import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { agentRuntimeClient } from '@/services/agentRuntime/client';
import { aiAgentService } from '@/services/aiAgent';

import BusinessAgentChatPanel, { isCurrentArchiveReferenceHref } from './index';

vi.mock('@/services/agentRuntime/client', () => ({
  agentRuntimeClient: {
    createStreamConnection: vi.fn(),
  },
}));

vi.mock('@/services/aiAgent', () => ({
  aiAgentService: {
    execAgentTask: vi.fn(),
  },
}));

type PanelProps = ComponentProps<typeof BusinessAgentChatPanel>;

const renderPanel = (props?: Partial<PanelProps>) =>
  render(
    <BusinessAgentChatPanel
      agentId="agt_archive"
      contextId="74929"
      kind="archive"
      placeholder="请输入问题"
      title="文档问答助手"
      {...props}
    />,
  );

const sendQuestion = async (props?: Partial<PanelProps>) => {
  renderPanel(props);
  fireEvent.change(screen.getByPlaceholderText('请输入问题'), {
    target: { value: '本文档标题是什么？' },
  });
  fireEvent.click(screen.getByRole('button', { name: /发送/ }));

  await waitFor(() => {
    expect(agentRuntimeClient.createStreamConnection).toHaveBeenCalled();
  });

  const streamOptions = vi.mocked(agentRuntimeClient.createStreamConnection).mock.calls.at(-1)?.[1];
  if (!streamOptions) throw new Error('Expected stream options to be passed');

  return streamOptions;
};

describe('BusinessAgentChatPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(aiAgentService.execAgentTask).mockResolvedValue({
      operationId: 'op_archive',
      topicId: 'topic_archive',
    });
    vi.mocked(agentRuntimeClient.createStreamConnection).mockReturnValue(new AbortController());
  });

  it('keeps completed answer when intentional close reports AbortError', async () => {
    const streamOptions = await sendQuestion();

    act(() => {
      streamOptions.onEvent?.({
        data: { content: '档案标题' },
        operationId: 'op_archive',
        stepIndex: 0,
        timestamp: Date.now(),
        type: 'stream_chunk',
      });
      streamOptions.onEvent?.({
        data: { reason: 'success' },
        operationId: 'op_archive',
        stepIndex: 1,
        timestamp: Date.now(),
        type: 'agent_runtime_end',
      });
      streamOptions.onError?.(new DOMException('BodyStreamBuffer was aborted', 'AbortError'));
    });

    expect(await screen.findByText('档案标题')).toBeInTheDocument();
    expect(screen.queryByText('BodyStreamBuffer was aborted')).not.toBeInTheDocument();
  });

  it('shows real stream errors', async () => {
    const streamOptions = await sendQuestion();

    act(() => {
      streamOptions.onError?.(new Error('network failed'));
    });

    expect(await screen.findByText('network failed')).toBeInTheDocument();
  });

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

  it('calls internal reference handler for current archive links only', async () => {
    const onInternalReferenceClick = vi.fn();
    const streamOptions = await sendQuestion({ onInternalReferenceClick });

    act(() => {
      streamOptions.onEvent?.({
        data: {
          content:
            '依据见 [P7](/enforcement/archive/74929?pageNum=7)，其他档案 [P3](/enforcement/archive/1?pageNum=3)。',
        },
        operationId: 'op_archive',
        stepIndex: 0,
        timestamp: Date.now(),
        type: 'stream_chunk',
      });
    });

    fireEvent.click(await screen.findByRole('link', { name: 'P7' }));
    expect(onInternalReferenceClick).toHaveBeenCalledWith('/enforcement/archive/74929?pageNum=7');

    fireEvent.click(screen.getByRole('link', { name: 'P3' }));
    expect(onInternalReferenceClick).toHaveBeenCalledTimes(1);
  });
});
