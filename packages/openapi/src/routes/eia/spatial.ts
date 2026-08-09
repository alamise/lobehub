/**
 * 准入判定 - 空间冲突检测（三线一单 / 生态保护红线 / 国土空间规划 / 饮用水水源保护区 / 声环境功能区划）。
 *
 * 五个维度统一采用「共享智能体（B 方案，内部直接调用）」方案，后端只负责组织输入、调用智能体、容错解析其 JSON 输出。
 *
 * 其中：
 *  - 三线一单 / 饮用水水源保护区 / 声环境功能区划：智能体自身挂载 hbai-mcp 工具，
 *    自行完成 地址识别 → 高德地理编码 → 空间碰撞检测 → 政策/法条关联 → 准入判定（真实碰撞）。
 *  - 生态保护红线 / 国土空间规划：当前处于 mock 阶段，尚无可对接的真实 MCP/地图服务。
 *    智能体不挂接任何工具、禁止联网搜索，仅依据大模型自身知识对建设项目的红线/规划符合性做初步研判，
 *    返回“判定通过 / 需要进一步核实 / 待补充信息”。待真实数据服务就绪后，按前三者的方式挂接工具即可平滑升级。
 *
 * 刻意不做任何直连 LLM 降级：降级会绕开智能体自身的提示词与工具配置，结果不可控。
 * 智能体调用失败时直接抛错，由上层如实回显。
 *
 * 历史：早期这些维度曾是后端硬编码的本地流水线或通用 LLM 判定
 * （1:1 迁移自 legacy-go-project-monorepo backend/internal/service/eia_*_service.go 与
 * backend/internal/eia_assessment/agents/admission_agent.go），现已统一下沉到智能体侧。
 */

import { runSharedAgent } from './agentRunner';
import {
  acousticZoneAgentId,
  type AdmissionDecisionOutput,
  type AnalyzeInput,
  ecologicalRedlineAgentId,
  normalizeAdmissionStatus,
  territorialPlanningAgentId,
  THREE_LINE_AGENT_ID,
  waterProtectionAgentId,
} from './agents';
import { extractJsonText, mustJsonCompact } from './llm';

const DEFAULT_PREVIEW_HOST = 'space-checker.mindlogicai.com';

const env = (key: string, fallback: string) => (process.env[key] || '').trim() || fallback;

const previewHost = () => env('EIA_SPACE_PREVIEW_HOST', DEFAULT_PREVIEW_HOST);

// ---------------------------------------------------------------------------
// 地图预览地址规范化（补全域名 + 强制带 embed=1，供前端 iframe 嵌入）
// ---------------------------------------------------------------------------

export const buildPreviewUrl = (rawPath?: string): string => {
  let path = (rawPath || '').trim();
  if (!path) return '';
  let parsed: URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      parsed = new URL(path);
    } catch {
      return path;
    }
  } else {
    let host = previewHost();
    if (!host.startsWith('http://') && !host.startsWith('https://')) host = `https://${host}`;
    host = host.replace(/\/+$/, '');
    if (!path.startsWith('/')) path = `/${path}`;
    try {
      parsed = new URL(host + path);
    } catch {
      return host + path;
    }
  }
  parsed.searchParams.set('embed', '1');
  return parsed.toString();
};

// ---------------------------------------------------------------------------
// 空间冲突检测：共享智能体公共逻辑
// ---------------------------------------------------------------------------

/** 空间智能体输出的容错解析：
 *  status / map_preview_url 结构固定；result_description 为长中文自由文本，
 *  常夹带未转义的英文双引号导致整体 JSON 非法，故严格解析失败后逐字段抽取。 */
const extractSpatialAgentResult = (
  text: string,
): { map_preview_url: string; result_description: string; status: string } => {
  // 先剥掉 <think>、```json 代码块并截取到最外层花括号，
  // 否则末尾字段的锚定正则会被代码块结束标记顶掉。
  const cleaned = extractJsonText(text);
  // 1) 严格解析优先（覆盖绝大多数正常返回）
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const status = String(parsed.status ?? '').trim();
    if (status) {
      return {
        map_preview_url: String(parsed.map_preview_url ?? '').trim(),
        result_description: String(parsed.result_description ?? '').trim(),
        status,
      };
    }
  } catch {
    // 进入容错分支
  }
  // 2) 容错抽取（容忍 result_description 中的未转义英文双引号）
  const status = cleaned.match(/"status"\s*:\s*"([^"]*)"/)?.[1]?.trim() ?? '';
  const mapPreviewUrl = cleaned.match(/"map_preview_url"\s*:\s*"([^"]*)"/)?.[1]?.trim() ?? '';
  let description =
    cleaned
      .match(/"result_description"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:map_preview_url|status)"\s*:/)?.[1]
      ?.trim() ?? '';
  if (!description) {
    description =
      cleaned.match(/"result_description"\s*:\s*"([\s\S]*?)"\s*(?:\}\s*)?$/)?.[1]?.trim() ?? '';
  }
  return { map_preview_url: mapPreviewUrl, result_description: description, status };
};

/** 统一的空间维度共享智能体调用：拼装任务提示词 + 记录 → 调智能体 → 解析归一 */
const runSpatialSharedAgent = async (options: {
  agentId: string;
  input: AnalyzeInput;
  label: string;
  stage: string;
  taskPrompt: string;
}): Promise<{ data: AdmissionDecisionOutput; raw: string }> => {
  const { agentId, input, label, stage, taskPrompt } = options;
  if (!agentId) {
    throw new Error(`${label}判定未配置决策智能体 ID，请在环境变量中配置后重启服务`);
  }
  if (!input.userId) {
    throw new Error(`${label}判定缺少用户标识，无法调用共享智能体`);
  }

  const summaryText = (input.record.steps.summary?.content || '').trim();
  const prompt = `${taskPrompt}

项目简要说明：
${summaryText || '（暂无项目简要说明）'}

环评判定记录：
${mustJsonCompact(input.record)}`;

  const trace: Record<string, unknown> = { agent_id: agentId, stage, summary_text: summaryText };

  // 内部直接调用共享智能体（B 方案，不走对外 API Key 链路）。
  // 严格依赖该智能体自身配置（系统提示词、hbai-mcp 工具、模型）产出结果，不引入任何直连 LLM 降级。
  const { text } = await runSharedAgent({
    agentId,
    prompt,
    signal: input.signal,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  trace.model_raw_response = text;

  const parsed = extractSpatialAgentResult(text);
  if (!parsed.status) {
    throw new Error(`${label}智能体未返回合法 JSON，原始回答前 200 字：${text.slice(0, 200)}`);
  }
  const description = parsed.result_description.trim();
  if (!description) throw new Error(`${label}判定结果缺少 result_description`);

  const data: AdmissionDecisionOutput = {
    map_preview_url: buildPreviewUrl(parsed.map_preview_url),
    result_description: description,
    status: normalizeAdmissionStatus(parsed.status),
  };
  trace.normalized_decision = data;
  return { data, raw: mustJsonCompact(trace) };
};

// ---------------------------------------------------------------------------
// 三线一单分区管控
// ---------------------------------------------------------------------------
//
// 智能体挂载的 hbai-mcp 工具：
//   1. geocode_address              地址 → 经纬度
//   2. check_control_zone_collision 经纬度 → 三线一单图斑碰撞结果（含 map_preview_url）
//   3. lookup_control_policy        管控单元编码 → 区域管控政策条文

/** 交给智能体的固定任务说明（智能体自身系统提示词负责角色与工具调用细则，此处只下达本次任务约束） */
const THREE_LINE_TASK_PROMPT = `请完成「环评准入判定 - 空间冲突检测 - 三线一单分区管控」判定。

必须按以下顺序调用 hbai-mcp 工具，不得跳过、不得凭空编造数据：
1. 从下方环评判定记录（重点看项目简要说明）中识别项目建设地点的完整中文地址，尽量包含省/市/区县与具体路段门牌。
2. 调用 geocode_address(address) 获取经纬度；若 matched 为 false 或未拿到经纬度，直接返回 status 为“待补充信息”。
3. 调用 check_control_zone_collision(longitude, latitude) 获取三线一单图斑碰撞结果。
4. 从碰撞结果 matches 中取出生态环境管控单元类图斑的 protection_code（以 ZH 开头的编码），
   调用 lookup_control_policy(unit_codes) 获取正式区域管控政策条文；若无 ZH 开头编码或命中的是园区类信息，则跳过本步。
5. 综合空间命中结果与政策条文给出准入判定。

判定规则：
1. 未获取到有效经纬度时，status 必须为“待补充信息”。
2. in_protection_area 为 false（未命中任何三线一单/生态环境分区管控单元）时，status 必须为“判定通过”。
3. 命中管控单元时，结合 highest_level、管控单元类别（优先保护单元 / 重点管控单元 / 一般管控单元）
   与 lookup_control_policy 返回的政策条文综合判断，status 取“判定通过 / 受限准入 / 判定不通过”之一。
4. 不得自行推导分区管控级别优先级，只能引用工具返回的原始文案表述。
5. 只能基于工具返回内容作答，严禁虚构未返回的分区管控信息或政策条文。

输出要求：
1. 只输出一个 JSON 对象，不要输出任何解释性文字、Markdown 代码块标记或思考过程。
2. JSON 结构固定为：{"status": string, "result_description": string, "map_preview_url": string}。
3. status 只能取“判定通过 / 判定不通过 / 受限准入 / 待补充信息”四个中文值之一，禁止使用 approved、rejected 等英文值。
4. result_description 必须写明解析出的项目地址与经纬度、命中情况、命中的管控单元名称/编码/类别，
   并在拿到政策条文时明确引用空间布局约束、污染物排放管控、环境风险防控、资源利用效率等维度作为判断依据，禁止只给结论。
5. map_preview_url 必须原样透传 check_control_zone_collision 返回的 map_preview_url，不得省略、改写或置空；工具未返回时填空字符串。
6. result_description 为自由文本，若需引用文件或条文名称请一律使用中文引号“”；
   严禁在 JSON 字符串值中使用未转义的英文双引号 "，否则会破坏 JSON 结构导致解析失败。`;

export const analyzeControlZone = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> =>
  runSpatialSharedAgent({
    agentId: THREE_LINE_AGENT_ID,
    input,
    label: '三线一单分区管控',
    stage: 'shared_agent_three_line',
    taskPrompt: THREE_LINE_TASK_PROMPT,
  });

// ---------------------------------------------------------------------------
// 饮用水水源保护区
// ---------------------------------------------------------------------------
//
// 智能体挂载的 hbai-mcp 工具：
//   1. geocode_address                  地址 → 经纬度
//   2. check_water_protection_collision 经纬度 → 水源保护区图斑碰撞结果（含 map_preview_url）
//   3. search_law                       法律法规检索（可选，用于补充禁止性条款依据）

const WATER_PROTECTION_TASK_PROMPT = `请完成「环评准入判定 - 空间冲突检测 - 饮用水水源保护区」判定。

必须按以下顺序调用 hbai-mcp 工具，不得跳过、不得凭空编造数据：
1. 从下方环评判定记录（重点看项目简要说明）中识别项目建设地点的完整中文地址，尽量包含省/市/区县与具体路段门牌。
2. 调用 geocode_address(address) 获取经纬度；若 matched 为 false 或未拿到经纬度，直接返回 status 为“待补充信息”。
3. 调用 check_water_protection_collision(longitude, latitude) 获取饮用水水源保护区碰撞结果。
4. 命中保护区时，可调用 search_law 检索饮用水水源保护区的禁止性规定作为判定依据（如生态环境法典、水污染防治法中关于
   一级保护区禁止新建改建扩建与供水设施和保护水源无关的建设项目、二级保护区排污口设置等条款）；未命中时跳过本步。
5. 综合空间命中结果与法律依据给出准入判定。

判定规则：
1. 未获取到有效经纬度时，status 必须为“待补充信息”。
2. in_protection_area 为 false（未命中任何饮用水水源保护区）时，status 必须为“判定通过”。
3. 命中一级保护区（highest_level 为“一级保护区”）时，status 必须为“判定不通过”。
4. 命中二级保护区、三级保护区、四级保护区、准保护区时，status 必须为“受限准入”。
5. 不得自行推导保护区级别优先级，只能引用工具返回的原始文案表述。
6. 只能基于工具返回内容作答，严禁虚构未返回的水源保护区信息或法律条文。

输出要求：
1. 只输出一个 JSON 对象，不要输出任何解释性文字、Markdown 代码块标记或思考过程。
2. JSON 结构固定为：{"status": string, "result_description": string, "map_preview_url": string}。
3. status 只能取“判定通过 / 判定不通过 / 受限准入 / 待补充信息”四个中文值之一，禁止使用 approved、rejected 等英文值。
4. result_description 必须写明解析出的项目地址与经纬度、是否命中、命中的水源保护区名称与保护级别，
   命中时还需给出对应的管控要求或法律依据，禁止只给结论。
5. map_preview_url 必须原样透传 check_water_protection_collision 返回的 map_preview_url，不得省略、改写或置空；工具未返回时填空字符串。
6. result_description 为自由文本，若需引用文件或条文名称请一律使用中文引号“”；
   严禁在 JSON 字符串值中使用未转义的英文双引号 "，否则会破坏 JSON 结构导致解析失败。`;

export const analyzeWaterProtection = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> =>
  runSpatialSharedAgent({
    agentId: waterProtectionAgentId(),
    input,
    label: '饮用水水源保护区',
    stage: 'shared_agent_water_protection',
    taskPrompt: WATER_PROTECTION_TASK_PROMPT,
  });

// ---------------------------------------------------------------------------
// 声环境功能区划
// ---------------------------------------------------------------------------
//
// 智能体挂载的 hbai-mcp 工具：
//   1. geocode_address               地址 → 经纬度
//   2. check_acoustic_zone_collision 经纬度 → 声环境功能区图斑碰撞结果（含 map_preview_url）
//   3. search_law                    法律法规检索（可选，用于补充噪声污染防治条款依据）
//
// 判定口径沿用旧系统：命中任一类功能区 → 受限准入；未命中 → 判定通过；无坐标 → 待补充信息。
// 与旧系统的差别在于说明文案不再由后端模板拼装，而由智能体结合功能区类别、
// GB 3096-2008 噪声限值与法条给出实质性说明。

const ACOUSTIC_ZONE_TASK_PROMPT = `请完成「环评准入判定 - 空间冲突检测 - 声环境功能区划」判定。

必须按以下顺序调用 hbai-mcp 工具，不得跳过、不得凭空编造数据：
1. 从下方环评判定记录（重点看项目简要说明）中识别项目建设地点的完整中文地址，尽量包含省/市/区县与具体路段门牌。
2. 调用 geocode_address(address) 获取经纬度；若 matched 为 false 或未拿到经纬度，直接返回 status 为“待补充信息”。
3. 调用 check_acoustic_zone_collision(longitude, latitude) 获取声环境功能区划碰撞结果。
4. 命中功能区时，可调用 search_law 检索噪声污染防治相关规定作为判定依据（如生态环境法典噪声污染防治相关条款、
   中华人民共和国噪声污染防治法中关于声环境质量标准适用区域、噪声敏感建筑物集中区域、
   工业噪声排放控制与建设项目环境影响评价的条款）；未命中时跳过本步。
5. 综合空间命中结果、功能区类别对应的噪声限值与法律依据给出准入判定。

判定规则：
1. 未获取到有效经纬度时，status 必须为“待补充信息”。
2. in_protection_area 为 false（项目位置未落入已划定的声环境功能区图斑）时，status 必须为“判定通过”。
3. in_protection_area 为 true（命中任一类声环境功能区）时，status 必须为“受限准入”，
   并说明该类别对应的昼间/夜间噪声限值与后续需核实的事项。
4. 不得自行改判功能区类别，只能引用工具返回的 highest_level / protection_level 原始文案。
5. matches 中的 protection_name 是图斑编号（如 201、315），不是中文名称，禁止臆造功能区名称。
6. 只能基于工具返回内容作答，严禁虚构未返回的功能区信息或法律条文。

输出要求：
1. 只输出一个 JSON 对象，不要输出任何解释性文字、Markdown 代码块标记或思考过程。
2. JSON 结构固定为：{"status": string, "result_description": string, "map_preview_url": string}。
3. status 只能取“判定通过 / 判定不通过 / 受限准入 / 待补充信息”四个中文值之一，禁止使用 approved、rejected 等英文值。
4. result_description 必须写明解析出的项目地址与经纬度、是否命中、命中的声环境功能区类别及其昼间/夜间噪声限值，
   并结合项目性质给出噪声管控要求或需进一步核实的事项，禁止只给结论。
5. map_preview_url 必须原样透传 check_acoustic_zone_collision 返回的 map_preview_url，不得省略、改写或置空；工具未返回时填空字符串。
6. result_description 为自由文本，若需引用文件或条文名称请一律使用中文引号“”；
   严禁在 JSON 字符串值中使用未转义的英文双引号 "，否则会破坏 JSON 结构导致解析失败。`;

export const analyzeAcousticZone = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> =>
  runSpatialSharedAgent({
    agentId: acousticZoneAgentId(),
    input,
    label: '声环境功能区划',
    stage: 'shared_agent_acoustic_zone',
    taskPrompt: ACOUSTIC_ZONE_TASK_PROMPT,
  });

// ---------------------------------------------------------------------------
// 生态保护红线（mock 阶段）
// ---------------------------------------------------------------------------
//
// 当前无可对接的真实 MCP / 地图服务。智能体不挂接任何工具、禁止联网搜索，
// 仅依据大模型自身知识对建设项目是否涉及生态保护红线约束做初步研判，
// 返回“判定通过 / 需要进一步核实 / 待补充信息”，map_preview_url 固定留空。
// 待真实数据服务（生态保护红线图斑碰撞）就绪后，按三线一单的方式挂接 hbai-mcp 工具即可平滑升级。

const ECO_REDLINE_TASK_PROMPT = `请完成「环评准入判定 - 空间冲突检测 - 生态保护红线」判定。

你当前不接入任何外部工具或地图服务，也不能进行联网搜索。请仅依据下方提供的“项目简要说明 / 环评判定记录”以及你自身掌握的生态保护相关法律法规与规划知识，对项目建设是否可能涉及生态保护红线约束做出初步研判。

研判要点：
1. 识别项目建设地点的行政位置（省/市/区县/具体地块）与建设性质（如线性工程、采掘、规模化养殖、化工、文旅开发、规模化基建等），判断是否可能落入生态保护红线区域（如自然保护地、饮用水水源保护区上游、重要湿地、珍稀动植物栖息地、生态脆弱区等）。
2. 结合《中华人民共和国环境保护法》《生态保护红线管理规定》《环境影响评价法》《自然保护区条例》《湿地保护法》等，说明若项目涉及红线可能触发的管控要求（核心保护区原则上禁止开发性建设，一般控制区有限人为活动需审批等），以及需要建设单位进一步核实的事项（如是否占用红线、是否取得规划符合性意见、是否需开展不可避让论证等）。
3. 给出明确结论：信息足以判断基本不涉及红线约束的，status 为“判定通过”；存在不确定性或需要建设单位/主管部门进一步核实红线符合性的，status 为“需要进一步核实”；项目说明过于匮乏以致无法研判的，status 为“待补充信息”。

输出要求：
1. 只输出一个 JSON 对象，不要输出任何解释性文字、Markdown 代码块标记或思考过程。
2. JSON 结构固定为：{"status": string, "result_description": string, "map_preview_url": string}。
3. status 只能取“判定通过 / 需要进一步核实 / 待补充信息”三者之一，禁止使用 approved、rejected 等英文值。
4. result_description 必须写明项目地点与性质、涉及生态保护红线的风险点、引用的法律法规或规划依据、以及需要进一步核实的具体事项，禁止只给结论；即便判断为判定通过也须简要说明依据。
5. map_preview_url 固定填空字符串""（本判定不提供地图预览）。
6. result_description 为自由文本，若需引用文件或条文名称请一律使用中文引号“”；严禁在 JSON 字符串值中使用未转义的英文双引号 "，否则会破坏 JSON 结构导致解析失败。`;

export const analyzeEcologicalRedline = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> =>
  runSpatialSharedAgent({
    agentId: ecologicalRedlineAgentId(),
    input,
    label: '生态保护红线',
    stage: 'shared_agent_eco_redline',
    taskPrompt: ECO_REDLINE_TASK_PROMPT,
  });

// ---------------------------------------------------------------------------
// 国土空间规划（mock 阶段）
// ---------------------------------------------------------------------------
//
// 与生态保护红线同理：当前无真实数据服务，不挂工具、禁搜索，仅用大模型知识做初步研判，
// 返回“判定通过 / 需要进一步核实 / 待补充信息”，map_preview_url 固定留空。

const LAND_PLAN_TASK_PROMPT = `请完成「环评准入判定 - 空间冲突检测 - 国土空间规划」判定。

你当前不接入任何外部工具或地图服务，也不能进行联网搜索。请仅依据下方提供的“项目简要说明 / 环评判定记录”以及你自身掌握的国土空间规划相关法律法规与规划知识，对项目建设是否符合国土空间规划与用途管制要求做出初步研判。

研判要点：
1. 识别项目建设地点的行政位置与建设性质，判断其可能落入的国土空间规划分区（生态空间/农业空间/城镇空间）及是否涉及“三区三线”中的永久基本农田、生态保护红线或城镇开发边界。
2. 结合《中华人民共和国土地管理法》《国土空间规划法》《城乡规划法》《基本农田保护条例》等，说明若项目与国土空间规划不符（如在生态/农业空间内新增城镇建设、占用永久基本农田、突破城镇开发边界等）可能触发的管控要求，以及需要建设单位进一步核实的事项（如是否取得规划选址意见、是否符合国土空间规划“一张图”、是否需调整规划或办理农转用手续等）。
3. 给出明确结论：信息足以判断基本符合国土空间规划与用途管制的，status 为“判定通过”；存在不确定性或需要建设单位/主管部门进一步核实规划符合性的，status 为“需要进一步核实”；项目说明过于匮乏以致无法研判的，status 为“待补充信息”。

输出要求：
1. 只输出一个 JSON 对象，不要输出任何解释性文字、Markdown 代码块标记或思考过程。
2. JSON 结构固定为：{"status": string, "result_description": string, "map_preview_url": string}。
3. status 只能取“判定通过 / 需要进一步核实 / 待补充信息”三者之一，禁止使用 approved、rejected 等英文值。
4. result_description 必须写明项目地点与性质、涉及国土空间规划的符合性风险点、引用的法律法规或规划依据、以及需要进一步核实的具体事项，禁止只给结论；即便判断为判定通过也须简要说明依据。
5. map_preview_url 固定填空字符串""（本判定不提供地图预览）。
6. result_description 为自由文本，若需引用文件或条文名称请一律使用中文引号“”；严禁在 JSON 字符串值中使用未转义的英文双引号 "，否则会破坏 JSON 结构导致解析失败。`;

export const analyzeTerritorialPlanning = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> =>
  runSpatialSharedAgent({
    agentId: territorialPlanningAgentId(),
    input,
    label: '国土空间规划',
    stage: 'shared_agent_land_plan',
    taskPrompt: LAND_PLAN_TASK_PROMPT,
  });
