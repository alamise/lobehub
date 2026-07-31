/**
 * 环评判定 Agent 提示词，1:1 迁移自 legacy-go-project-monorepo
 * backend/internal/eia_assessment/agents/{summary,industry,admission}_agent.go
 */

import { appendKnowledgeContextPrompt, callJson, mustJson } from './llm';
import type { IndustryResult, TypeResult, WorkflowRecord } from './state';

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
// 行业归类分析
// ---------------------------------------------------------------------------

export const runIndustry = async (input: AnalyzeInput) => {
  const systemPrompt = `你是“环评判定-行业归类分析 Agent”。
你不能调用工具，只能依据用户提供的项目摘要与上下文完成判断。
你必须只输出 JSON，对象格式如下：
{
  "content": "面向审批人员的简洁分析结论",
  "industry_result": {
    "code": "国民经济行业分类编号，未知时给出最合理编号",
    "name": "行业名称"
  }
}`;
  let userPrompt = `请基于以下环评判定记录，完成“行业归类分析”。

要求：
1. 优先依据建设内容、工艺、产品、服务形态判断最贴近的行业分类。
2. content 要简洁、专业，2-4 句即可。
3. 必须返回合法 JSON。

记录：
${mustJson(input.record)}`;
  userPrompt = appendKnowledgeContextPrompt(userPrompt, input.knowledgeContext);
  return callJson<IndustryOutput>(systemPrompt, userPrompt, { signal: input.signal });
};

// ---------------------------------------------------------------------------
// 环评类型分析
// ---------------------------------------------------------------------------

export const runType = async (input: AnalyzeInput) => {
  const systemPrompt = `你是“环评判定-环评类型分析 Agent”。
你不能调用工具，只能依据给定项目材料进行初步专业判断。
你必须只输出 JSON，对象格式如下：
{
  "content": "环评类型分析说明",
  "type_result": {
    "submissionAllowed": "允许|不允许|待定",
    "materialType": "A报告书|B报告表|C登记表|"
  }
}`;
  let userPrompt = `请基于以下环评判定记录，完成“环评类型分析”。

要求：
1. 结合项目建设内容、污染特征、敏感性和审批常见口径进行判断。
2. 若信息不足，submissionAllowed 返回“待定”，materialType 可返回空字符串。
3. content 要说明判断依据，禁止空泛。
4. 必须返回合法 JSON。

记录：
${mustJson(input.record)}`;
  userPrompt = appendKnowledgeContextPrompt(userPrompt, input.knowledgeContext);
  return callJson<TypeOutput>(systemPrompt, userPrompt, { signal: input.signal });
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

export const normalizeAdmissionStatus = (status: string): string => {
  const trimmed = (status || '').trim();
  return ['判定通过', '判定不通过', '受限准入', '待补充信息'].includes(trimmed)
    ? trimmed
    : '待补充信息';
};

export const runAdmissionDecision = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string; agentCode: string }> => {
  const [agentCode, targetLabel] = admissionAgentCodeAndLabel(input.targetId);
  const systemPrompt = `你是“${targetLabel} Agent”。
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
