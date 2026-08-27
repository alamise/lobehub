// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { ToolExecutionService } from '../index';

describe('ToolExecutionService', () => {
  it('rejects archive-scoped tools when business context is missing', async () => {
    const callTool = vi.fn();
    const service = new ToolExecutionService({
      builtinToolsExecutor: { execute: vi.fn() } as any,
      mcpService: { callTool } as any,
    });

    const result = await service.executeTool(
      {
        apiName: 'document_archive_search',
        arguments: JSON.stringify({ archive_id: 123, query: '验收意见' }),
        id: 'tool-call-1',
        identifier: 'hbai-mcp',
        type: 'mcp',
      },
      { toolManifestMap: { 'hbai-mcp': { mcpParams: { type: 'http' } } as any } },
    );

    expect(result.success).toBe(false);
    expect(result.error).toEqual(expect.objectContaining({ code: 'BUSINESS_CONTEXT_REQUIRED' }));
    expect(callTool).not.toHaveBeenCalled();
  });

  it('injects archive_id from archive business context for document MCP tools', async () => {
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    const service = new ToolExecutionService({
      builtinToolsExecutor: { execute: vi.fn() } as any,
      mcpService: { callTool } as any,
    });

    await service.executeTool(
      {
        apiName: 'document_archive_search',
        arguments: JSON.stringify({ archive_id: 1, query: '验收意见' }),
        id: 'tool-call-1',
        identifier: 'hbai-mcp',
        type: 'mcp',
      },
      {
        businessContext: { archiveId: '123', kind: 'archive' },
        toolManifestMap: { 'hbai-mcp': { mcpParams: { type: 'http' } } as any },
      },
    );

    expect(callTool).toHaveBeenCalledWith(
      expect.objectContaining({
        argsStr: JSON.stringify({ archive_id: 123, query: '验收意见' }),
        toolName: 'document_archive_search',
      }),
    );
  });

  it('routes connector calls as MCP when the model marks them builtin', async () => {
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    const service = new ToolExecutionService({
      builtinToolsExecutor: { execute: vi.fn() } as any,
      mcpService: { callTool } as any,
    });

    await service.executeTool(
      {
        apiName: 'document_archive_search',
        arguments: JSON.stringify({ archive_id: 224176, query: '抄送' }),
        id: 'tool-call-connector',
        identifier: 'hbai-env-tools',
        type: 'builtin',
      },
      {
        businessContext: { archiveId: '224176', kind: 'archive' },
        toolManifestMap: {
          'hbai-env-tools': {
            api: [],
            identifier: 'hbai-env-tools',
            mcpParams: { type: 'http', url: 'http://mcp.test/mcp' },
            type: 'mcp',
          } as any,
        },
      },
    );

    expect(callTool).toHaveBeenCalled();
  });

  it('injects enterprise_id from enterprise business context for enterprise MCP tools', async () => {
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    const service = new ToolExecutionService({
      builtinToolsExecutor: { execute: vi.fn() } as any,
      mcpService: { callTool } as any,
    });

    await service.executeTool(
      {
        apiName: 'enterprise_basic_info_query',
        arguments: JSON.stringify({ enterprise_id: 1 }),
        id: 'tool-call-1',
        identifier: 'hbai-mcp',
        type: 'mcp',
      },
      {
        businessContext: { enterpriseId: '456', kind: 'enterprise' },
        toolManifestMap: { 'hbai-mcp': { mcpParams: { type: 'http' } } as any },
      },
    );

    expect(callTool).toHaveBeenCalledWith(
      expect.objectContaining({
        argsStr: JSON.stringify({ enterprise_id: 456 }),
        toolName: 'enterprise_basic_info_query',
      }),
    );
  });

  it('can skip low-level result truncation for AgentRuntime archival', async () => {
    const builtinToolsExecutor = {
      execute: vi.fn().mockResolvedValue({
        content: '0123456789',
        success: true,
      }),
    };
    const service = new ToolExecutionService({
      builtinToolsExecutor: builtinToolsExecutor as any,
      mcpService: {} as any,
    });

    const result = await service.executeTool(
      {
        apiName: 'search',
        arguments: '{}',
        id: 'tool-call-1',
        identifier: 'lobe-web-browsing',
        type: 'builtin',
      },
      {
        skipResultTruncation: true,
        toolManifestMap: {},
        toolResultMaxLength: 5,
      },
    );

    expect(result.content).toBe('0123456789');
  });

  it('keeps existing low-level truncation by default', async () => {
    const builtinToolsExecutor = {
      execute: vi.fn().mockResolvedValue({
        content: '0123456789',
        success: true,
      }),
    };
    const service = new ToolExecutionService({
      builtinToolsExecutor: builtinToolsExecutor as any,
      mcpService: {} as any,
    });

    const result = await service.executeTool(
      {
        apiName: 'search',
        arguments: '{}',
        id: 'tool-call-1',
        identifier: 'lobe-web-browsing',
        type: 'builtin',
      },
      {
        toolManifestMap: {},
        toolResultMaxLength: 5,
      },
    );

    expect(result.content).toContain('01234');
    expect(result.content).toContain('Content truncated');
  });
});
