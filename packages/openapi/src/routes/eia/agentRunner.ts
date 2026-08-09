/**
 * 内部直接调用「共享智能体」的运行器（B 方案）。
 *
 * 与对外 HTTP `/api/v1/responses` 不同，这里不走 API Key 链路，而是在系统内部
 * 复用 `AiAgentService.execAgent` 同步执行智能体，等待完成后从 `AgentState`
 * 提取最终助手消息文本返回。鉴权复用 better-auth 会话身份（userId/workspaceId），
 * 智能体按自身 `workspaceId` + 当前用户权限解析，等价于在业务页内直接调用。
 */

import type { AgentState } from '@lobechat/agent-runtime';

import { getServerDB } from '@/database/core/db-adaptor';
import { AgentRuntimeService } from '@/server/services/agentRuntime';
import { AiAgentService } from '@/server/services/aiAgent';

export interface RunSharedAgentParams {
  agentId: string;
  prompt: string;
  signal?: AbortSignal;
  userId: string;
  workspaceId?: string;
}

export interface RunSharedAgentResult {
  finalState: AgentState;
  text: string;
}

/**
 * 从 AgentState 提取最后一条助手消息的文本。
 * 与 packages/openapi/src/services/responses.service.ts 的 extractAssistantContent 保持一致。
 */
const extractAssistantContent = (state: AgentState): string => {
  if (!state.messages?.length) return '';
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    const msg = state.messages[i];
    if (msg.role === 'assistant' && msg.content) {
      return typeof msg.content === 'string' ? msg.content : '';
    }
  }
  return '';
};

/**
 * 在系统内部同步运行一个共享智能体并返回其最终回答文本。
 *
 * 流程与 `ResponsesService.createResponse`（非流式）一致：
 *   1. execAgent({ autoStart: false }) 创建 operation；
 *   2. AgentRuntimeService.executeSync(operationId) 同步等待执行完成；
 *   3. 从 finalState 提取最终助手文本。
 */
export const runSharedAgent = async (
  params: RunSharedAgentParams,
): Promise<RunSharedAgentResult> => {
  const { agentId, prompt, userId, workspaceId, signal } = params;
  const db = await getServerDB();

  const aiAgentService = new AiAgentService(db, userId, { workspaceId });

  const execResult = await aiAgentService.execAgent({
    agentId,
    autoStart: false,
    prompt,
    signal,
    stream: false,
    trigger: 'eia',
  });

  if (!execResult.success) {
    throw new Error(execResult.error || '调用共享智能体失败（execAgent 未成功创建运行）');
  }

  const agentRuntimeService = new AgentRuntimeService(db, userId, {
    queueService: null,
    workspaceId,
  });

  const finalState = await agentRuntimeService.executeSync(execResult.operationId);

  return { finalState, text: extractAssistantContent(finalState) };
};
