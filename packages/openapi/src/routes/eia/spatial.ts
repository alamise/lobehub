/**
 * 空间冲突两阶段判定（地址抽取 → 高德地理编码 → 空间碰撞接口 → LLM 判定）。
 * 1:1 迁移自 legacy-go-project-monorepo backend/internal/service/
 *   eia_water_protection_service.go / eia_acoustic_zone_service.go / eia_control_zone_service.go
 */

import { runSharedAgent } from './agentRunner';
import {
  type AdmissionDecisionOutput,
  type AnalyzeInput,
  extractProjectAddressByModel,
  normalizeAdmissionStatus,
  runAdmissionDecision,
  THREE_LINE_AGENT_ID,
  type ToolCallTrace,
} from './agents';
import { extractJsonText, mustJsonCompact } from './llm';
import { defaultSpatialMap, type WorkflowRecord } from './state';

const DEFAULT_AMAP_KEY = '64f3434145aaaa237eba0ca8978ee0a0';
const DEFAULT_AMAP_URL = 'https://restapi.amap.com/v3/geocode/geo';
const DEFAULT_PREVIEW_HOST = 'space-checker.mindlogicai.com';
const CHECK_URLS = {
  acousticZone: 'https://space-checker-api.mindlogicai.com/api/sound/check',
  controlZone: 'https://space-checker-api.mindlogicai.com/api/control/check',
  waterProtection: 'https://space-checker-api.mindlogicai.com/api/water/check',
} as const;
const DEFAULT_TIMEOUT_MS = 15_000;

const env = (key: string, fallback: string) => (process.env[key] || '').trim() || fallback;

const amapKey = () => env('EIA_AMAP_KEY', DEFAULT_AMAP_KEY);
const amapUrl = () => env('EIA_AMAP_GEOCODE_URL', DEFAULT_AMAP_URL);
const previewHost = () => env('EIA_SPACE_PREVIEW_HOST', DEFAULT_PREVIEW_HOST);
const checkUrl = (kind: keyof typeof CHECK_URLS) => {
  const overrides: Record<keyof typeof CHECK_URLS, string> = {
    acousticZone: 'EIA_ACOUSTIC_ZONE_CHECK_URL',
    controlZone: 'EIA_CONTROL_ZONE_CHECK_URL',
    waterProtection: 'EIA_WATER_PROTECTION_CHECK_URL',
  };
  return env(overrides[kind], CHECK_URLS[kind]);
};

export interface Coordinates {
  formatted_address: string;
  latitude: number;
  longitude: number;
  match_level: string;
}

export interface CollisionMatch {
  admin_code?: string | null;
  category?: string;
  dataset_name?: string;
  note?: string | null;
  protection_code?: string | null;
  protection_level?: string;
  protection_name?: string;
  source_file?: string;
}

export interface CollisionResponse {
  dataset_name?: string;
  highest_level?: string;
  in_protection_area: boolean;
  latitude?: number;
  longitude?: number;
  map_preview_url?: string;
  matches?: CollisionMatch[];
}

export interface ControlPolicyRow {
  environmental_risk_prevention: string;
  id: number;
  pollutant_emission_control: string;
  priority_control_targets: string;
  resource_use_efficiency_requirements: string;
  spatial_layout_guidance: string;
  unit_category: string;
  unit_code: string;
  unit_name: string;
}

interface AnalyzeTrace {
  collision_tool?: ToolCallTrace;
  decision_payload?: unknown;
  extract_address_tool?: ToolCallTrace;
  fallback_description?: string;
  geocode_tool?: ToolCallTrace;
  model_raw_response?: string;
  normalized_decision?: AdmissionDecisionOutput;
  stage: string;
  summary_text?: string;
}

const fetchWithTimeout = async (url: string, init: RequestInit, signal?: AbortSignal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// ---------------------------------------------------------------------------
// 高德地理编码
// ---------------------------------------------------------------------------

const parseLocation = (location: string): [number, number] => {
  const parts = (location || '').trim().split(',');
  if (parts.length !== 2) throw new Error('location 格式无效');
  const lon = Number.parseFloat(parts[0].trim());
  const lat = Number.parseFloat(parts[1].trim());
  if (!Number.isFinite(lon)) throw new Error('解析经度失败');
  if (!Number.isFinite(lat)) throw new Error('解析纬度失败');
  return [lon, lat];
};

export const geocodeAddress = async (
  address: string,
  signal?: AbortSignal,
): Promise<{ coords?: Coordinates; trace: ToolCallTrace; error?: Error }> => {
  const trace: ToolCallTrace = {
    description: '高德地址转经纬度工具',
    status: 'success',
    tool_name: 'amap_geocode',
  };
  const key = amapKey();
  const url = amapUrl();
  if (!address.trim()) {
    trace.status = 'error';
    trace.error_message = '地址为空';
    return { error: new Error('地址为空'), trace };
  }
  const query = new URLSearchParams({ address, key });
  const requestUrl = `${url}?${query.toString()}`;
  trace.request = { address, key, url };

  try {
    const response = await fetchWithTimeout(requestUrl, { method: 'GET' }, signal);
    const body = await response.text();
    trace.raw_response = body;
    if (!response.ok) {
      throw new Error(`高德接口返回状态码异常: ${response.status}`);
    }
    const payload = JSON.parse(body) as {
      status?: string;
      geocodes?: { formatted_address?: string; location?: string; level?: string }[];
    };
    trace.response = { payload, request_url: requestUrl };
    if (payload.status !== '1' || !payload.geocodes?.length) {
      trace.status = 'empty';
      trace.error_message = '高德接口未返回有效地理编码';
      return { error: new Error('高德接口未返回有效地理编码'), trace };
    }
    const [longitude, latitude] = parseLocation(payload.geocodes[0].location || '');
    return {
      coords: {
        formatted_address: (payload.geocodes[0].formatted_address || '').trim(),
        latitude,
        longitude,
        match_level: (payload.geocodes[0].level || '').trim(),
      },
      trace,
    };
  } catch (error) {
    trace.status = 'error';
    trace.error_message = (error as Error).message;
    return { error: error as Error, trace };
  }
};

// ---------------------------------------------------------------------------
// 空间碰撞接口
// ---------------------------------------------------------------------------

const checkCollision = async (
  kind: keyof typeof CHECK_URLS,
  toolName: string,
  description: string,
  errorLabel: string,
  body: { longitude: number; latitude: number },
  signal?: AbortSignal,
): Promise<{ data?: CollisionResponse; trace: ToolCallTrace; error?: Error }> => {
  const trace: ToolCallTrace = {
    description,
    request: body,
    status: 'success',
    tool_name: toolName,
  };
  try {
    const response = await fetchWithTimeout(
      checkUrl(kind),
      {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      signal,
    );
    const text = await response.text();
    trace.raw_response = text;
    if (!response.ok) {
      throw new Error(`${errorLabel}返回状态码异常: ${response.status}`);
    }
    const data = JSON.parse(text) as CollisionResponse;
    trace.response = data;
    return { data, trace };
  } catch (error) {
    trace.status = 'error';
    trace.error_message = (error as Error).message;
    return { error: error as Error, trace };
  }
};

// ---------------------------------------------------------------------------
// 预览地址（拼接 ?embed=1）
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
// 公共：地址 → 坐标 → 碰撞
// ---------------------------------------------------------------------------

const supplementOutput = (description: string): AdmissionDecisionOutput => ({
  result_description: description.trim(),
  status: '待补充信息',
});

const withSpatialNote = (
  record: WorkflowRecord,
  aspectId: string,
  payload: unknown,
): WorkflowRecord => {
  const copy: WorkflowRecord = structuredClone(record);
  const admission = copy.steps.admission;
  if (!admission.spatialAspectNotes) admission.spatialAspectNotes = defaultSpatialMap();
  admission.spatialAspectNotes[aspectId] = mustJsonCompact(payload);
  return copy;
};

interface StageOneResult {
  address?: string;
  collision?: CollisionResponse;
  coords?: Coordinates;
  fallback?: AdmissionDecisionOutput;
  trace: AnalyzeTrace;
}

const runStageOne = async (
  input: AnalyzeInput,
  kind: keyof typeof CHECK_URLS,
  labels: {
    toolName: string;
    description: string;
    errorLabel: string;
    domain: string;
  },
): Promise<StageOneResult> => {
  const summaryText = (input.record.steps.summary?.content || '').trim();
  const trace: AnalyzeTrace = { stage: 'extract_address', summary_text: summaryText };

  const extracted = await extractProjectAddressByModel(summaryText, input.signal);
  trace.extract_address_tool = extracted.trace;
  if (!extracted.address) {
    const fallback = supplementOutput(
      extracted.error
        ? `项目地址抽取失败，当前无法获取精准经纬度，不能开展${labels.domain}空间冲突检测。`
        : `项目简要说明中未提取到明确建设地点，无法获取精准经纬度，不能开展${labels.domain}空间冲突检测。`,
    );
    trace.fallback_description = fallback.result_description;
    return { fallback, trace };
  }

  trace.stage = 'geocode';
  const geocoded = await geocodeAddress(extracted.address, input.signal);
  trace.geocode_tool = geocoded.trace;
  if (!geocoded.coords) {
    const fallback = supplementOutput(
      `项目地址“${extracted.address}”无法解析出有效经纬度，不能开展${labels.domain}空间冲突检测。`,
    );
    trace.fallback_description = fallback.result_description;
    return { address: extracted.address, fallback, trace };
  }

  trace.stage = 'collision_check';
  const collided = await checkCollision(
    kind,
    labels.toolName,
    labels.description,
    labels.errorLabel,
    { latitude: geocoded.coords.latitude, longitude: geocoded.coords.longitude },
    input.signal,
  );
  trace.collision_tool = collided.trace;
  if (!collided.data) {
    const fallback = supplementOutput(
      `已获取项目经纬度，但${labels.domain}空间碰撞接口调用失败，当前无法完成${labels.domain}检测，请稍后重试或补充人工核查结果。`,
    );
    trace.fallback_description = fallback.result_description;
    return { address: extracted.address, coords: geocoded.coords, fallback, trace };
  }

  collided.data.map_preview_url = buildPreviewUrl(collided.data.map_preview_url);
  trace.stage = 'llm_decision';
  return {
    address: extracted.address,
    collision: collided.data,
    coords: geocoded.coords,
    trace,
  };
};

const locationText = (address: string, coords: Coordinates) =>
  `${address}（坐标：经度${coords.longitude}，纬度${coords.latitude}）`;

// ---------------------------------------------------------------------------
// 饮用水保护区
// ---------------------------------------------------------------------------

const normalizeWaterProtectionStatus = (status: string) => {
  const trimmed = (status || '').trim();
  return ['判定通过', '判定不通过', '待补充信息', '受限准入'].includes(trimmed)
    ? trimmed
    : '待补充信息';
};

export const analyzeWaterProtection = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> => {
  const stage = await runStageOne(input, 'waterProtection', {
    description: '水资源保护区空间碰撞接口',
    domain: '饮用水保护区',
    errorLabel: '水保护区接口',
    toolName: 'water_protection_collision_check',
  });
  if (stage.fallback) return { data: stage.fallback, raw: mustJsonCompact(stage.trace) };

  const collision = stage.collision!;
  const coords = stage.coords!;
  const address = stage.address!;
  const payload = {
    coordinates: coords,
    decision_rules: [
      '未获取到有效经纬度时，status 必须为“待补充信息”。',
      '命中一级饮用水保护区时，status 必须为“判定不通过”。',
      '命中二级保护区、三级保护区、四级保护区、准保护区时，status 必须为“受限准入”。',
      '未命中任何饮用水保护区时，status 必须为“判定通过”。',
    ],
    project_address: address,
    spatial_collision: collision,
    special_conditions: [
      '只能基于输入的地址解析结果和空间碰撞接口结果作答，不得虚构未返回的保护区信息。',
      'result_description 必须写清命中情况、保护区等级、项目坐标及对应管控结论。',
      'map_preview_url 必须原样透传输入中的 spatial_collision.map_preview_url，不得省略、改写或置空。',
    ],
    target_label: '空间冲突检测-饮用水保护区',
  };
  stage.trace.decision_payload = payload;

  const decision = await runAdmissionDecision({
    ...input,
    knowledgeContext: `以下为饮用水保护区两阶段判定的固定输入，请严格按规则生成结构化结论：\n${mustJsonCompact(payload)}`,
    record: withSpatialNote(input.record, 'waterProtection', payload),
  });
  stage.trace.model_raw_response = decision.raw;

  const status = normalizeWaterProtectionStatus(decision.data.status);
  const level = (collision.highest_level || '').trim();
  let description = decision.data.result_description.trim();
  if (status === '判定通过') {
    description = `项目地址${locationText(address, coords)}未命中饮用水保护区。`;
  } else if (status === '判定不通过') {
    description = `项目地址${locationText(address, coords)}命中${level || '饮用水保护区'}，存在空间冲突。`;
  } else if (status === '受限准入') {
    description = `项目地址${locationText(address, coords)}命中${level || '饮用水保护区'}，需进一步核实准入要求。`;
  }
  const mapPreviewUrl =
    buildPreviewUrl(decision.data.map_preview_url) || buildPreviewUrl(collision.map_preview_url);
  if (!description) throw new Error('饮用水保护区判定结果缺少 result_description');

  const data: AdmissionDecisionOutput = {
    map_preview_url: mapPreviewUrl,
    result_description: description,
    status,
  };
  stage.trace.normalized_decision = data;
  return { data, raw: mustJsonCompact(stage.trace) };
};

// ---------------------------------------------------------------------------
// 声环境功能区划
// ---------------------------------------------------------------------------

const normalizeAcousticZoneStatus = (status: string, inProtectionArea: boolean) => {
  const trimmed = (status || '').trim();
  if (trimmed === '待补充信息') return '待补充信息';
  return inProtectionArea ? '受限准入' : '判定通过';
};

export const analyzeAcousticZone = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> => {
  const stage = await runStageOne(input, 'acousticZone', {
    description: '声环境功能区划空间碰撞接口',
    domain: '声环境功能区划',
    errorLabel: '声功能区接口',
    toolName: 'acoustic_zone_collision_check',
  });
  if (stage.fallback) return { data: stage.fallback, raw: mustJsonCompact(stage.trace) };

  const collision = stage.collision!;
  const coords = stage.coords!;
  const address = stage.address!;
  const payload = {
    coordinates: coords,
    decision_rules: [
      '未获取到有效经纬度时，status 必须为“待补充信息”。',
      '命中任一声环境功能区时，status 必须为“受限准入”。',
      '未命中任何声环境功能区时，status 必须为“判定通过”。',
    ],
    project_address: address,
    spatial_collision: collision,
    special_conditions: [
      '只能基于输入的地址解析结果和空间碰撞接口结果作答，不得虚构未返回的功能区信息。',
      'result_description 必须简明说明命中情况、功能区等级及后续核实要求。',
      'map_preview_url 必须原样透传输入中的 spatial_collision.map_preview_url，不得省略、改写或置空。',
    ],
    target_label: '空间冲突检测-声环境功能区划',
  };
  stage.trace.decision_payload = payload;

  const decision = await runAdmissionDecision({
    ...input,
    knowledgeContext: `以下为声环境功能区划两阶段判定的固定输入，请严格按规则生成结构化结论：\n${mustJsonCompact(payload)}`,
    record: withSpatialNote(input.record, 'acousticZone', payload),
  });
  stage.trace.model_raw_response = decision.raw;

  const status = normalizeAcousticZoneStatus(decision.data.status, collision.in_protection_area);
  const level = (collision.highest_level || '').trim();
  let description = decision.data.result_description.trim();
  if (status === '判定通过') {
    description = `项目地址${locationText(address, coords)}未命中声环境功能区。`;
  } else if (status === '受限准入') {
    description = `项目地址${locationText(address, coords)}命中${level || '声环境功能区'}，需进一步核实声环境管控要求。`;
  }
  const mapPreviewUrl =
    buildPreviewUrl(decision.data.map_preview_url) || buildPreviewUrl(collision.map_preview_url);
  if (!description) throw new Error('声环境功能区划判定结果缺少 result_description');

  const data: AdmissionDecisionOutput = {
    map_preview_url: mapPreviewUrl,
    result_description: description,
    status,
  };
  stage.trace.normalized_decision = data;
  return { data, raw: mustJsonCompact(stage.trace) };
};

// ---------------------------------------------------------------------------
// 三线一单分区管控（共享智能体 + hbai-mcp 工具链）
// ---------------------------------------------------------------------------
//
// 与饮用水源保护区 / 声环境功能区的两阶段本地流水线不同，三线一单整条链路
// （地址识别 → 高德地理编码 → 空间碰撞检测 → 生态环境管控单元政策库关联 → 准入判定）
// 全部交由「环评准入判定-三线一单分区管控」决策智能体自主完成，其挂载的 hbai-mcp 工具为：
//   1. geocode_address              地址 → 经纬度
//   2. check_control_zone_collision 经纬度 → 三线一单图斑碰撞结果（含 map_preview_url）
//   3. lookup_control_policy        管控单元编码 → 区域管控政策条文
// 后端只负责组织输入、调用智能体、容错解析其 JSON 输出，不做任何直连 LLM 降级。

/** 三线一单智能体输出的容错解析：
 *  status / map_preview_url 结构固定；result_description 为长中文自由文本，
 *  常夹带未转义的英文双引号导致整体 JSON 非法，故严格解析失败后逐字段抽取。 */
const extractThreeLineResult = (
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
): Promise<{ data: AdmissionDecisionOutput; raw: string }> => {
  if (!input.userId) {
    throw new Error('三线一单分区管控判定缺少用户标识，无法调用共享智能体');
  }

  const summaryText = (input.record.steps.summary?.content || '').trim();
  const prompt = `${THREE_LINE_TASK_PROMPT}

项目简要说明：
${summaryText || '（暂无项目简要说明）'}

环评判定记录：
${mustJsonCompact(input.record)}`;

  const trace: Record<string, unknown> = {
    agent_id: THREE_LINE_AGENT_ID,
    stage: 'shared_agent_three_line',
    summary_text: summaryText,
  };

  // 内部直接调用「三线一单分区管控决策智能体」（B 方案，不走对外 API Key 链路）。
  // 严格依赖该智能体自身配置（系统提示词、hbai-mcp 工具、模型）产出结果，不引入任何直连 LLM 降级。
  const { text } = await runSharedAgent({
    agentId: THREE_LINE_AGENT_ID,
    prompt,
    signal: input.signal,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  trace.model_raw_response = text;

  const parsed = extractThreeLineResult(text);
  if (!parsed.status) {
    throw new Error(
      `三线一单分区管控智能体未返回合法 JSON，原始回答前 200 字：${text.slice(0, 200)}`,
    );
  }
  const description = parsed.result_description.trim();
  if (!description) throw new Error('三线一单分区管控判定结果缺少 result_description');

  const data: AdmissionDecisionOutput = {
    map_preview_url: buildPreviewUrl(parsed.map_preview_url),
    result_description: description,
    status: normalizeAdmissionStatus(parsed.status),
  };
  trace.normalized_decision = data;
  return { data, raw: mustJsonCompact(trace) };
};
