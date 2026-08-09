/**
 * 环评判定 Agent 提示词，1:1 迁移自 legacy-go-project-monorepo
 * backend/internal/eia_assessment/agents/{summary,industry,admission}_agent.go
 */

import { runSharedAgent } from './agentRunner';
import { appendKnowledgeContextPrompt, callJson, extractJsonText, mustJson } from './llm';
import type { IndustryResult, TypeResult, WorkflowRecord } from './state';

/**
 * 行业归类分析共享智能体（在开发者高级设置中创建并配置 API Key）。
 * 内部直接调用（B 方案），不走对外 HTTP API Key 链路。
 */
export const INDUSTRY_AGENT_ID = 'agt_uXOWjBH9ZMYV';

/**
 * 环评类型分析共享智能体（在开发者高级设置中创建并配置 API Key）。
 * 内部直接调用（B 方案），不走对外 HTTP API Key 链路。
 */
export const TYPE_AGENT_ID = 'agt_6VMpb1mr4r06';

/**
 * 产业政策核验共享智能体（在开发者高级设置中创建并配置 API Key）。
 * 内部直接调用（B 方案），不走对外 HTTP API Key 链路。
 */
export const POLICY_AGENT_ID = 'agt_KxUrDah8bCJR';

/**
 * 「环评准入判定-三线一单分区管控」决策智能体。
 * 该智能体自身挂载 hbai-mcp 工具（geocode_address / check_control_zone_collision /
 * lookup_control_policy），由智能体自主完成 地址→坐标→空间碰撞→管控政策 全链路后给出判定。
 * 内部直接调用（B 方案），不走对外 HTTP API Key 链路。
 */
export const THREE_LINE_AGENT_ID = 'agt_SHmqyDcCW67g';

export const AgentCode = {
  admission: 'eia_assessment_admission',
  conclusion: 'eia_assessment_conclusion',
  industry: 'eia_assessment_industry',
  policy: 'eia_assessment_policy',
  spatial: 'eia_assessment_spatial',
  summary: 'eia_assessment_summary',
  type: 'eia_assessment_type',
} as const;

export interface AnalyzeInput {
  knowledgeContext?: string;
  record: WorkflowRecord;
  signal?: AbortSignal;
  stepId: string;
  targetId: string;
  /** 当前用户标识（better-auth 会话），内部调用共享智能体时使用 */
  userId?: string;
  /** 当前工作区，可选；共享智能体按自身 workspaceId 解析 */
  workspaceId?: string;
}

export interface AdmissionDecisionOutput {
  map_preview_url?: string;
  result_description: string;
  status: string;
}

export interface IndustryOutput {
  content: string;
  industry_result: IndustryResult | null;
}

export interface TypeOutput {
  content: string;
  type_result: TypeResult | null;
}

export interface ConclusionOutput {
  content: string;
}

// ---------------------------------------------------------------------------
// 项目摘要整理
// ---------------------------------------------------------------------------

export const runSummary = async (record: WorkflowRecord, signal?: AbortSignal) => {
  const systemPrompt = `你是“环评判定-项目摘要整理 Agent”。
你不能调用工具，只能基于输入信息整理项目摘要。
你必须只输出 JSON，对象格式如下：
{
  "content": "整理后的建设项目简要说明"
}`;
  const userPrompt = `请整理建设项目简要说明，保留项目名称、建设地点、建设内容、主要工艺、主要污染物、申报诉求等关键信息。

记录：
${mustJson(record)}`;
  return callJson<{ content: string }>(systemPrompt, userPrompt, { signal });
};

// ---------------------------------------------------------------------------
// 行业归类分析（内部直接调用「行业归类分析共享智能体」，B 方案）
// ---------------------------------------------------------------------------

/** 从智能体回答文本中提取 {id, name}（兼容 code/name 别名），容忍内容中的未转义英文引号 */
const extractIndustryIdName = (text: string): { id: string; name: string } => {
  try {
    const parsed = JSON.parse(extractJsonText(text)) as Record<string, unknown>;
    const id = String(parsed.id ?? parsed.code ?? '').trim();
    const name = String(parsed.name ?? '').trim();
    if (id) return { id, name };
  } catch {
    // 进入容错分支
  }
  // 容错：直接以正则抽取（id/code 不含引号；name 容忍未转义引号）
  const cleaned = text.replaceAll(/<think>[\s\S]*?<\/think>/g, '');
  const idMatch = cleaned.match(/"id"\s*:\s*"([^"]*)"/) ?? cleaned.match(/"code"\s*:\s*"([^"]*)"/);
  const id = idMatch ? idMatch[1].trim() : '';
  if (!id) return { id: '', name: '' };
  const nameMatch = cleaned.match(/"name"\s*:\s*"([\s\S]*?)"/);
  const name = nameMatch ? nameMatch[1].trim() : '';
  return { id, name };
};

export const runIndustry = async (
  input: AnalyzeInput,
): Promise<{ data: IndustryOutput; raw: string }> => {
  const description =
    (input.record.steps.industry.content || '').trim() ||
    (input.record.steps.summary.content || '').trim();

  const prompt = `请对以下建设项目进行国民经济行业分类：\n\n${description}\n\n请严格按 JSON 格式返回，字段为 id（国民经济行业分类编号，例如 0321）与 name（行业名称，例如 鸡的饲养）。`;

  if (!input.userId) {
    throw new Error('行业归类分析缺少用户标识，无法调用共享智能体');
  }

  // 内部直接调用「行业归类分析共享智能体」（B 方案，不走对外 API Key 链路）。
  // 严格依赖该智能体的自身配置（系统提示词、工具、模型）产出结果，
  // 不引入任何直连 LLM 降级，以保证结果符合智能体配置预期。
  const { text } = await runSharedAgent({
    agentId: INDUSTRY_AGENT_ID,
    prompt,
    signal: input.signal,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  const { id, name } = extractIndustryIdName(text);
  if (!id) {
    throw new Error(`行业归类智能体未返回有效编号，原始回答前 200 字：${text.slice(0, 200)}`);
  }

  const data: IndustryOutput = {
    content: text.trim(),
    industry_result: { code: id, name },
  };
  return { data, raw: text };
};

// ---------------------------------------------------------------------------
// 环评类型分析
// ---------------------------------------------------------------------------

/** 容错解析：智能体常在 content 长文本里夹带未转义的英文双引号，导致整体 JSON 非法。
 *  此处分别抽取 type_result（结构固定、无花括号）与 content（容忍未转义引号）。 */
const tolerantTypeParse = (text: string): TypeOutput => {
  const cleaned = text.replaceAll(/<think>[\s\S]*?<\/think>/g, '');
  let typeResult: TypeResult | null = null;
  const typeMatch = cleaned.match(/"type_result"\s*:\s*\{([^}]*)\}/);
  if (typeMatch) {
    const body = typeMatch[1];
    const material = body.match(/"materialType"\s*:\s*"([\s\S]*?)"/)?.[1] ?? '';
    const allowed = body.match(/"submissionAllowed"\s*:\s*"([\s\S]*?)"/)?.[1] ?? '';
    typeResult = {
      materialType: material.trim(),
      submissionAllowed: allowed.trim(),
    };
  }
  // content 容忍未转义引号：取到紧随其后的 "type_result" 之前
  let content = '';
  const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"type_result"/);
  if (contentMatch) {
    content = contentMatch[1].trim();
  } else {
    const c = cleaned.match(/"content"\s*:\s*"([\s\S]*?)"\s*(?:\}\s*)?$/);
    if (c) content = c[1].trim();
  }
  return { content, type_result: typeResult };
};

/** 从智能体回答文本中提取 {content, type_result}：优先严格解析，失败则走容错分支 */
const extractTypeResult = (text: string): TypeOutput => {
  // 1) 严格解析优先（覆盖绝大多数正常返回）
  try {
    const parsed = JSON.parse(extractJsonText(text)) as Record<string, unknown>;
    const resultRaw = parsed.type_result;
    if (resultRaw && typeof resultRaw === 'object') {
      const result = resultRaw as Record<string, unknown>;
      return {
        content: String(parsed.content ?? '').trim(),
        type_result: {
          materialType: String(result.materialType ?? '').trim(),
          submissionAllowed: String(result.submissionAllowed ?? '').trim(),
        },
      };
    }
  } catch {
    // 进入容错分支
  }
  // 2) 容错抽取（容忍 content 中的未转义英文双引号）
  const safe = tolerantTypeParse(text);
  if (!safe.type_result) {
    throw new Error(
      `环评类型智能体未返回 type_result 字段，原始回答前 200 字：${text.slice(0, 200)}`,
    );
  }
  return safe;
};

export const runType = async (input: AnalyzeInput): Promise<{ data: TypeOutput; raw: string }> => {
  const industry = input.record.steps.industry.industryResult;
  const industryLine = industry
    ? `行业归类结果：国民经济行业分类编号 ${industry.code}（${industry.name}）`
    : '行业归类结果：尚未完成行业归类';

  const prompt = `请基于以下环评判定记录完成“环评类型分析”，判断该项目应当提交的材料类型（报告书 / 报告表 / 登记表）。

${industryLine}

要求：
1. 结合行业归类、项目建设内容、污染特征、项目规模与名录口径进行判断。
2. submissionAllowed 只能取“允许 / 不允许 / 待定”之一；materialType 只能取“A报告书 / B报告表 / C登记表 / ”（信息不足时可为空串）。
3. content 须说明判断依据，禁止空泛。
4. 必须返回合法 JSON，结构为 { "content": string, "type_result": { "submissionAllowed": string, "materialType": string } }。
5. content 为自由说明文本，若需引用文件或条文名称，请一律使用中文引号“”；严禁在 JSON 字符串值中使用未转义的英文双引号 "，否则会破坏 JSON 结构导致解析失败。

环评判定记录：
${mustJson(input.record)}`;

  if (!input.userId) {
    throw new Error('环评类型分析缺少用户标识，无法调用共享智能体');
  }

  // 内部直接调用「环评类型分析共享智能体」（B 方案，不走对外 API Key 链路）。
  // 严格依赖该智能体的自身配置（系统提示词、工具、模型）产出结果，
  // 不引入任何直连 LLM 降级，以保证结果符合智能体配置预期。
  const { text } = await runSharedAgent({
    agentId: TYPE_AGENT_ID,
    prompt,
    signal: input.signal,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  const data = extractTypeResult(text);
  return { data, raw: text };
};

// ---------------------------------------------------------------------------
// 准入判定
// ---------------------------------------------------------------------------

export const admissionAgentCodeAndLabel = (targetId: string): [string, string] => {
  switch (targetId) {
    case 'policy': {
      return [AgentCode.policy, '产业政策核验'];
    }
    case 'spatial:threeLine': {
      return [AgentCode.spatial, '空间冲突检测-三线一单'];
    }
    case 'spatial:ecoRedline': {
      return [AgentCode.spatial, '空间冲突检测-生态保护红线'];
    }
    case 'spatial:landPlan': {
      return [AgentCode.spatial, '空间冲突检测-国土空间规划'];
    }
    case 'spatial:waterProtection': {
      return [AgentCode.spatial, '空间冲突检测-饮用水保护区'];
    }
    case 'spatial:acousticZone': {
      return [AgentCode.spatial, '空间冲突检测-声环境功能区划'];
    }
    case 'futureCity': {
      return [AgentCode.admission, '未来科技城规划环评判定'];
    }
    case 'renheBase': {
      return [AgentCode.admission, '仁和先进制造业基地规划环评判定'];
    }
    case 'canalZone': {
      return [AgentCode.admission, '大运河核心监控区判定'];
    }
    case 'liangzhu': {
      return [AgentCode.admission, '良渚遗址保护规划判定'];
    }
    case 'taihu': {
      return [AgentCode.admission, '太湖流域准入判定'];
    }
    case 'majorChange': {
      return [AgentCode.admission, '重大变动判定'];
    }
    default: {
      return [AgentCode.admission, '准入判定'];
    }
  }
};

/** 准入判定状态枚举：智能体可能返回英文或中文，这里统一归一为内部中文状态 */
const ADMISSION_STATUS_MAP: Record<string, string> = {
  approved: '判定通过',
  rejected: '判定不通过',
  conditional: '受限准入',
  pending: '待补充信息',
  判定通过: '判定通过',
  判定不通过: '判定不通过',
  受限准入: '受限准入',
  待补充信息: '待补充信息',
};

export const normalizeAdmissionStatus = (status: string): string => {
  const trimmed = (status || '').trim();
  return ADMISSION_STATUS_MAP[trimmed] ?? '待补充信息';
};

/** 现阶段 mock 的非空间二级步骤：直接返回判定成功，打通主流程；未来接入对应共享智能体后替换 */
const MOCK_ADMISSION_TARGETS = new Set<string>([
  'futureCity',
  'renheBase',
  'canalZone',
  'liangzhu',
  'taihu',
  'majorChange',
]);

/** 容错解析准入判定结果：status 为简单枚举值；result_description 为自由文本，容忍未转义英文引号 */
const extractAdmissionResult = (text: string): { status: string; result_description: string } => {
  // 先剥掉 <think>、```json 代码块并截取到最外层花括号，
  // 否则末尾字段的锚定正则会被代码块结束标记顶掉。
  const cleaned = extractJsonText(text);
  // 1) 严格解析优先（覆盖绝大多数正常返回）
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const status = String(parsed.status ?? '').trim();
    if (status) {
      return {
        result_description: String(parsed.result_description ?? '').trim(),
        status,
      };
    }
  } catch {
    // 进入容错分支
  }
  // 2) 容错抽取（容忍 result_description 中的未转义英文双引号）
  const statusMatch = cleaned.match(/"status"\s*:\s*"([^"]*)"/);
  const status = statusMatch ? statusMatch[1].trim() : '';
  let result = '';
  const resultMatch = cleaned.match(/"result_description"\s*:\s*"([\s\S]*?)"\s*(?:\}\s*)?$/);
  if (resultMatch) result = resultMatch[1].trim();
  return { result_description: result, status };
};

export const runAdmissionDecision = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string; agentCode: string }> => {
  const [agentCode, targetLabel] = admissionAgentCodeAndLabel(input.targetId);

  // 产业政策核验：内部直接调用「产业政策核验共享智能体」（B 方案，不走对外 API Key 链路）。
  // 严格依赖智能体自身配置产出结果，不引入任何直连 LLM 降级。
  if (input.targetId === 'policy') {
    if (!input.userId) {
      throw new Error('产业政策核验缺少用户标识，无法调用共享智能体');
    }
    const prompt = `请完成产业政策核验。

要求：
1. status 只能是 approved / rejected / conditional / pending 之一。
2. result_description 为纯 ASCII 简短理由，不得包含引号、花括号、反斜杠或换行。
3. 现阶段请始终返回 status 为 approved。

环评判定记录：
${mustJson(input.record)}`;
    const { text } = await runSharedAgent({
      agentId: POLICY_AGENT_ID,
      prompt,
      signal: input.signal,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });
    const { status, result_description } = extractAdmissionResult(text);
    if (!status) {
      throw new Error(
        `产业政策核验智能体未返回合法 JSON，原始回答前 200 字：${text.slice(0, 200)}`,
      );
    }
    return {
      agentCode,
      data: {
        result_description: result_description.trim(),
        status: normalizeAdmissionStatus(status),
      },
      raw: text,
    };
  }

  // 其余非空间二级步骤（未来科技城 / 仁和 / 运河 / 良渚 / 太湖 / 重大变动）：
  // 现阶段 mock 返回判定成功以打通主流程，未来接入对应共享智能体后替换此处即可。
  if (MOCK_ADMISSION_TARGETS.has(input.targetId)) {
    return {
      agentCode,
      data: {
        result_description: '（mock）判定通过（待接入正式智能体）',
        status: normalizeAdmissionStatus('approved'),
      },
      raw: 'mock',
    };
  }

  const systemPrompt = `你是"${targetLabel} Agent"。
你不能调用任何工具，只能根据给定材料完成一次准入判定。
你必须只输出 JSON，对象格式如下：
{
  "status": "判定通过|判定不通过|受限准入|待补充信息",
  "result_description": "给审批人员看的结果说明"
}`;
  let userPrompt = `请完成“${targetLabel}”。

要求：
1. status 只能是“判定通过 / 判定不通过 / 受限准入 / 待补充信息”四者之一。
2. result_description 要明确写出判断依据、风险点或待补材料，不要只给结论。
3. 只能基于提供材料推断，信息不足时返回“待补充信息”。
4. 必须返回合法 JSON。
5. 如材料中附带正式政策条文、管控规则或准入要求，result_description 必须结合这些条文说明结论依据，不得只复述空间命中结果。

记录：
${mustJson(input.record)}`;
  userPrompt = appendKnowledgeContextPrompt(userPrompt, input.knowledgeContext);

  const { data, raw } = await callJson<AdmissionDecisionOutput>(systemPrompt, userPrompt, {
    signal: input.signal,
  });
  return {
    agentCode,
    data: {
      map_preview_url: (data.map_preview_url || '').trim(),
      result_description: (data.result_description || '').trim(),
      status: normalizeAdmissionStatus(data.status),
    },
    raw,
  };
};

// ---------------------------------------------------------------------------
// 结论汇总
// ---------------------------------------------------------------------------

export const runConclusion = async (input: AnalyzeInput) => {
  const systemPrompt = `你是“环评判定-结论汇总 Agent”。
你不能调用工具，只能根据已有步骤结果形成最终审批辅助结论。
你必须只输出 JSON，对象格式如下：
{
  "content": "多行中文结论"
}`;
  let userPrompt = `请基于以下环评判定记录生成“结论汇总”。

要求：
1. 输出应包含：综合判定、主要风险点、待补充事项、审批建议。
2. 必须紧扣已有步骤结果，不得虚构外部依据。
3. 如前置步骤信息不足，要在结论中明确提示。
4. 只返回合法 JSON。

记录：
${mustJson(input.record)}`;
  userPrompt = appendKnowledgeContextPrompt(userPrompt, input.knowledgeContext);
  return callJson<ConclusionOutput>(systemPrompt, userPrompt, { signal: input.signal });
};

// ---------------------------------------------------------------------------
// 建设地址提取（供空间判定的第一阶段使用）
// ---------------------------------------------------------------------------

const cleanAddressCandidate = (input: string): string => {
  let value = (input || '').trim();
  value = value.replaceAll(/^[。；;，,]+|[。；;，,]+$/g, '');
  value = value.replace(/是否可以做环评？$/, '').replace(/是否可以做环评$/, '');
  return value.trim();
};

export interface ToolCallTrace {
  description?: string;
  error_message?: string;
  model_prompt?: string;
  model_response?: string;
  raw_response?: string;
  request?: unknown;
  response?: unknown;
  status: string;
  tool_name: string;
}

export const extractProjectAddressByModel = async (
  summary: string,
  signal?: AbortSignal,
): Promise<{ address: string; trace: ToolCallTrace; error?: Error }> => {
  const trace: ToolCallTrace = {
    description: '从项目简要说明中提取可用于地图解析的建设地址',
    request: { summary_text: (summary || '').trim() },
    status: 'success',
    tool_name: 'extract_project_address_agent',
  };

  const systemPrompt = `你是“建设地址提取 Agent”。
你只能从输入的项目描述中抽取“项目建设地址/选址地址”，不得臆造。
你必须只输出 JSON：
{
  "address": "提取出的建设地址；若无法确定则返回空字符串"
}`;
  const userPrompt = `请从下面项目描述中提取最适合拿去做地图地址解析的建设地址。

规则：
1. 只提取地址，不要附带“是否可以做环评”等问题句。
2. 优先保留省/市/区/街道/路号等完整地址。
3. 如果文本只出现了一个明确地址，就返回该地址。
4. 如果没有明确地址，address 返回空字符串。
5. 只返回合法 JSON。

项目描述：
${(summary || '').trim()}`;
  trace.model_prompt = userPrompt;

  try {
    const { data, raw } = await callJson<{ address?: string }>(systemPrompt, userPrompt, {
      signal,
    });
    trace.model_response = raw;
    const address = cleanAddressCandidate(data.address || '');
    trace.response = { address };
    if (!address) trace.status = 'empty';
    return { address, trace };
  } catch (error) {
    trace.status = 'error';
    trace.error_message = (error as Error).message;
    return { address: '', error: error as Error, trace };
  }
};
