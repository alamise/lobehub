/**
 * 空间冲突两阶段判定（地址抽取 → 高德地理编码 → 空间碰撞接口 → LLM 判定）。
 * 1:1 迁移自 legacy-go-project-monorepo backend/internal/service/
 *   eia_water_protection_service.go / eia_acoustic_zone_service.go / eia_control_zone_service.go
 */

import { withClient } from '../legacyDb';
import {
  type AdmissionDecisionOutput,
  type AnalyzeInput,
  extractProjectAddressByModel,
  runAdmissionDecision,
  type ToolCallTrace,
} from './agents';
import { mustJsonCompact } from './llm';
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
// 三线一单（含区域管控政策关联）
// ---------------------------------------------------------------------------

interface PolicyMatchContext {
  control_policy?: ControlPolicyRow;
  eligible: boolean;
  policy_matched: boolean;
  skip_reason?: string;
  spatial_match: CollisionMatch;
  unit_code?: string;
}

const extractEligibleControlUnitCode = (match: CollisionMatch): [string, boolean, string] => {
  const code = (match.protection_code || '').trim();
  if (!code) return ['', false, '命中图斑缺少管控单元编码'];
  const haystack = [
    (match.protection_name || '').trim(),
    (match.protection_level || '').trim(),
    (match.category || '').trim(),
    (match.dataset_name || '').trim(),
  ].join(' ');
  if (haystack.includes('园区')) return [code, false, '命中图斑为园区类信息，跳过政策库关联'];
  if (!haystack.includes('管控单元')) {
    return [code, false, '命中图斑非生态环境管控单元类，跳过政策库关联'];
  }
  if (!code.startsWith('ZH')) return [code, false, '命中图斑编码不是标准管控单元编码'];
  return [code, true, ''];
};

export const findControlPoliciesByUnitCodes = async (
  unitCodes: string[],
): Promise<Map<string, ControlPolicyRow>> => {
  const result = new Map<string, ControlPolicyRow>();
  if (unitCodes.length === 0) return result;
  const rows = await withClient(async (client) => {
    const r = await client.query<ControlPolicyRow>(
      `SELECT id, unit_code, unit_name, unit_category, spatial_layout_guidance,
              pollutant_emission_control, environmental_risk_prevention,
              resource_use_efficiency_requirements, priority_control_targets
       FROM control_policy WHERE unit_code = ANY($1::text[])`,
      [unitCodes],
    );
    return r.rows;
  });
  for (const row of rows) result.set(row.unit_code, row);
  return result;
};

const buildPolicyMatchContext = async (
  matches: CollisionMatch[],
): Promise<PolicyMatchContext[]> => {
  const contexts: PolicyMatchContext[] = [];
  const unitCodes: string[] = [];
  for (const match of matches) {
    const [unitCode, eligible, skipReason] = extractEligibleControlUnitCode(match);
    contexts.push({
      eligible,
      policy_matched: false,
      skip_reason: skipReason,
      spatial_match: match,
      unit_code: unitCode,
    });
    if (eligible) unitCodes.push(unitCode);
  }
  if (unitCodes.length === 0) return contexts;

  try {
    const policyMap = await findControlPoliciesByUnitCodes(unitCodes);
    for (const item of contexts) {
      if (!item.eligible || !item.unit_code) continue;
      const policy = policyMap.get(item.unit_code);
      if (!policy) {
        item.skip_reason = '政策库中未匹配到该管控单元编码';
        continue;
      }
      item.policy_matched = true;
      item.control_policy = policy;
    }
  } catch (error) {
    console.warn('[EIAControlZone] 区域管控政策关联查询失败，回退仅使用空间碰撞结果', error);
  }
  return contexts;
};

const buildPolicyLookupSummary = (matches: PolicyMatchContext[]): string => {
  if (matches.length === 0) return '未命中任何三线一单图斑，无需关联区域管控政策。';
  let eligibleCount = 0;
  let matchedCount = 0;
  let skippedCount = 0;
  for (const item of matches) {
    if (item.eligible) eligibleCount++;
    if (item.policy_matched) matchedCount++;
    if (!item.eligible || !item.policy_matched) skippedCount++;
  }
  return `命中图斑${matches.length}条，其中符合生态环境管控单元关联条件${eligibleCount}条，成功匹配区域管控政策${matchedCount}条，其余${skippedCount}条按空间结果直接判定。`;
};

const firstControlZoneMatchDetail = (matches: CollisionMatch[]): string => {
  if (matches.length === 0) return '';
  const first = matches[0];
  const parts: string[] = [];
  if ((first.protection_name || '').trim()) parts.push(first.protection_name!.trim());
  if ((first.protection_level || '').trim()) parts.push(first.protection_level!.trim());
  if ((first.protection_code || '').trim()) parts.push(`编码${first.protection_code!.trim()}`);
  return parts.join(' / ');
};

const normalizeControlZoneStatus = (status: string, inProtectionArea: boolean) => {
  const trimmed = (status || '').trim();
  if (trimmed === '待补充信息') return '待补充信息';
  if (['判定通过', '判定不通过', '受限准入'].includes(trimmed)) {
    return inProtectionArea ? trimmed : '判定通过';
  }
  return inProtectionArea ? '受限准入' : '判定通过';
};

export const analyzeControlZone = async (
  input: AnalyzeInput,
): Promise<{ data: AdmissionDecisionOutput; raw: string }> => {
  const stage = await runStageOne(input, 'controlZone', {
    description: '三线一单分区管控空间碰撞接口',
    domain: '三线一单分区管控',
    errorLabel: '三线一单接口',
    toolName: 'control_zone_collision_check',
  });
  if (stage.fallback) return { data: stage.fallback, raw: mustJsonCompact(stage.trace) };

  const collision = stage.collision!;
  const coords = stage.coords!;
  const address = stage.address!;
  const policyMatches = await buildPolicyMatchContext(collision.matches || []);

  const payload = {
    coordinates: coords,
    decision_rules: [
      '未获取到有效经纬度时，status 必须为“待补充信息”。',
      '未命中任何三线一单/生态环境分区管控单元时，status 必须为“判定通过”。',
      '命中三线一单/生态环境分区管控单元时，必须结合空间命中信息、管控单元等级及附带政策条文综合判断 status，可返回“判定通过 / 受限准入 / 判定不通过”。',
      'control 分区管控级别不自行推导优先级，只能基于 highest_level 和 matches 原始文案表述。',
      '若 matched_control_policies 中附带了 control_policy，必须结合其中完整政策字段进行准入分析，不得忽略正式管控条文。',
    ],
    matched_control_policies: policyMatches,
    policy_lookup_summary_hint: buildPolicyLookupSummary(policyMatches),
    project_address: address,
    spatial_collision: collision,
    special_conditions: [
      '只能基于输入的地址解析结果、空间碰撞接口结果、以及已附带的区域管控政策库内容作答，不得虚构未返回的分区管控信息。',
      'result_description 必须说明命中情况、管控单元名称/编码/等级或类型，并在有政策条文时明确引用政策维度作为判断依据。',
      'map_preview_url 必须原样透传输入中的 spatial_collision.map_preview_url，不得省略、改写或置空。',
    ],
    target_label: '空间冲突检测-三线一单',
  };
  stage.trace.decision_payload = payload;

  const decision = await runAdmissionDecision({
    ...input,
    knowledgeContext: `以下为三线一单分区管控两阶段判定的固定输入。你必须同时参考空间命中结果与附带的区域管控政策条文，按规则生成结构化结论：\n${mustJsonCompact(payload)}`,
    record: withSpatialNote(input.record, 'threeLine', payload),
  });
  stage.trace.model_raw_response = decision.raw;

  const status = normalizeControlZoneStatus(decision.data.status, collision.in_protection_area);
  let description = decision.data.result_description.trim();
  if (!description) {
    if (status === '判定通过') {
      description = `项目地址${locationText(address, coords)}未命中三线一单分区管控单元。`;
    } else if (status === '受限准入') {
      const detail =
        firstControlZoneMatchDetail(collision.matches || []) ||
        (collision.highest_level || '').trim() ||
        '三线一单分区管控单元';
      description = `项目地址${locationText(address, coords)}命中${detail}，需进一步核实生态环境分区管控准入要求。`;
    }
  }
  const mapPreviewUrl =
    buildPreviewUrl(decision.data.map_preview_url) || buildPreviewUrl(collision.map_preview_url);
  if (!description) throw new Error('三线一单分区管控判定结果缺少 result_description');

  const data: AdmissionDecisionOutput = {
    map_preview_url: mapPreviewUrl,
    result_description: description,
    status,
  };
  stage.trace.normalized_decision = data;
  return { data, raw: mustJsonCompact(stage.trace) };
};
