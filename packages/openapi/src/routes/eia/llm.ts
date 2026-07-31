/**
 * 环评判定 Agent 的 LLM Runner。
 * 对应旧项目 backend/internal/eia_assessment/agents/runner.go（eino + openai 兼容协议）。
 * 新项目改接 SiliconCloud（OpenAI 兼容 /chat/completions）。
 */

const DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1';
const DEFAULT_MODEL = 'Qwen/Qwen3-8B';
const DEFAULT_TIMEOUT_MS = 120_000;

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export const getLlmConfig = (): LlmConfig => {
  const apiKey = (
    process.env.EIA_LLM_API_KEY ||
    process.env.SILICONCLOUD_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ''
  ).trim();
  const baseUrl = (process.env.EIA_LLM_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  const model = (process.env.EIA_LLM_MODEL || DEFAULT_MODEL).trim();
  const timeoutMs = Number(process.env.EIA_LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
};

/** 剥离思考链与 ```json 围栏，抽出纯 JSON 文本 */
export const extractJsonText = (input: string): string => {
  let raw = (input || '').trim();
  raw = raw.replaceAll(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?/i, '').trim();
    if (raw.endsWith('```')) raw = raw.slice(0, -3).trim();
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  return raw.trim();
};

export interface CallJsonResult<T> {
  data: T;
  raw: string;
}

/** 调用 LLM 并强制解析为 JSON；失败时抛错并携带 raw 文本 */
export const callJson = async <T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { signal?: AbortSignal },
): Promise<CallJsonResult<T>> => {
  const config = getLlmConfig();
  if (!config.apiKey) {
    throw new Error('环评判定 Agent 模型未配置（缺少 SILICONCLOUD_API_KEY）');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  if (options?.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let text: string;
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        enable_thinking: false,
        messages: [
          { content: systemPrompt, role: 'system' },
          { content: userPrompt, role: 'user' },
        ],
        model: config.model,
        stream: false,
        temperature: 0.2,
      }),
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`执行环评判定 Agent 失败: HTTP ${response.status} ${body.slice(0, 300)}`);
    }
    const payload = JSON.parse(body) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    text = payload.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }

  const raw = extractJsonText(text);
  try {
    return { data: JSON.parse(raw) as T, raw };
  } catch (error) {
    throw new Error(
      `解析环评判定 Agent 输出失败: ${(error as Error).message}; raw=${raw.slice(0, 300)}`,
      { cause: error },
    );
  }
};

export const mustJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
};

export const mustJsonCompact = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
};

/** 与旧项目 appendKnowledgeContextPrompt 一致 */
export const appendKnowledgeContextPrompt = (userPrompt: string, knowledgeContext?: string) => {
  const context = (knowledgeContext || '').trim();
  if (!context) return userPrompt;
  return `${userPrompt}

系统已从 Elasticsearch 知识库检索到以下候选依据。你只能基于这些候选依据和输入记录判断，不得自行补充未检索到的外部依据：
${context}`;
};
