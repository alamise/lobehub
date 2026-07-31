/**
 * AI 环评判定状态机（1:1 迁移自 legacy-go-project-monorepo
 * backend/internal/service/eia_assessment_service.go + model/eia_assessment_gorm.go）
 */

export const STEP_KEYS = ['summary', 'industry', 'type', 'admission', 'conclusion'] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export const ADMISSION_SUBSTEP_IDS = [
  'policy',
  'spatial',
  'futureCity',
  'renheBase',
  'canalZone',
  'liangzhu',
  'taihu',
  'majorChange',
] as const;
export type AdmissionSubstepId = (typeof ADMISSION_SUBSTEP_IDS)[number];

export const SPATIAL_ASPECT_IDS = [
  'threeLine',
  'ecoRedline',
  'landPlan',
  'waterProtection',
  'acousticZone',
] as const;
export type SpatialAspectId = (typeof SPATIAL_ASPECT_IDS)[number];

export interface IndustryResult {
  code: string;
  name: string;
}

export interface TypeResult {
  materialType: string;
  submissionAllowed: string;
}

export interface StepState {
  activeAdmissionSubstepId?: string;
  admissionSubstepNotes?: Record<string, string>;
  admissionSubsteps?: Record<string, string>;
  admissionSubstepStatuses?: Record<string, string>;
  content: string;
  industryResult?: IndustryResult | null;
  industryStatus?: string;
  spatialAspectNotes?: Record<string, string>;
  spatialAspectPreviewUrls?: Record<string, string>;
  spatialAspectResults?: Record<string, string>;
  spatialAspectStatuses?: Record<string, string>;
  typeResult?: TypeResult | null;
  typeStatus?: string;
  updatedAt: number | null;
}

export interface WorkflowRecord {
  completed: boolean;
  createdAt: number;
  currentStep: string;
  id: string;
  steps: Record<string, StepState>;
  updatedAt: number;
}

const buildMap = (keys: readonly string[], value: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of keys) result[key] = value;
  return result;
};

export const defaultAdmissionMap = (): Record<string, string> =>
  buildMap(ADMISSION_SUBSTEP_IDS, '');
export const defaultAdmissionStatuses = (): Record<string, string> =>
  buildMap(ADMISSION_SUBSTEP_IDS, '未判定');
export const defaultSpatialMap = (): Record<string, string> => buildMap(SPATIAL_ASPECT_IDS, '');
export const defaultSpatialStatuses = (): Record<string, string> =>
  buildMap(SPATIAL_ASPECT_IDS, '未判定');

const mergeStringMap = (
  base: Record<string, string>,
  input?: Record<string, string> | null,
): Record<string, string> => ({ ...base, ...input });

export const mergeDefaultSteps = (
  input?: Record<string, Partial<StepState>> | null,
): Record<string, StepState> => {
  const steps: Record<string, StepState> = {
    admission: {
      activeAdmissionSubstepId: 'policy',
      admissionSubstepNotes: defaultAdmissionMap(),
      admissionSubstepStatuses: defaultAdmissionStatuses(),
      admissionSubsteps: defaultAdmissionMap(),
      content: '',
      spatialAspectNotes: defaultSpatialMap(),
      spatialAspectPreviewUrls: defaultSpatialMap(),
      spatialAspectResults: defaultSpatialMap(),
      spatialAspectStatuses: defaultSpatialStatuses(),
      updatedAt: null,
    },
    conclusion: { content: '', updatedAt: null },
    industry: { content: '', industryResult: null, industryStatus: 'idle', updatedAt: null },
    summary: { content: '', updatedAt: null },
    type: { content: '', typeResult: null, typeStatus: 'idle', updatedAt: null },
  };

  if (!input) return steps;

  for (const [key, rawValue] of Object.entries(input)) {
    const value = (rawValue || {}) as Partial<StepState>;
    const base = steps[key];
    if (!base) {
      steps[key] = { content: '', updatedAt: null, ...value } as StepState;
      continue;
    }
    if (value.content || !base.content) base.content = value.content || base.content || '';
    if (value.updatedAt !== undefined && value.updatedAt !== null) base.updatedAt = value.updatedAt;
    if (value.activeAdmissionSubstepId) {
      base.activeAdmissionSubstepId = value.activeAdmissionSubstepId;
    }
    if (key === 'admission') {
      base.admissionSubsteps = mergeStringMap(defaultAdmissionMap(), value.admissionSubsteps);
      base.admissionSubstepNotes = mergeStringMap(
        defaultAdmissionMap(),
        value.admissionSubstepNotes,
      );
      base.admissionSubstepStatuses = mergeStringMap(
        defaultAdmissionStatuses(),
        value.admissionSubstepStatuses,
      );
      base.spatialAspectResults = mergeStringMap(defaultSpatialMap(), value.spatialAspectResults);
      base.spatialAspectNotes = mergeStringMap(defaultSpatialMap(), value.spatialAspectNotes);
      base.spatialAspectStatuses = mergeStringMap(
        defaultSpatialStatuses(),
        value.spatialAspectStatuses,
      );
      base.spatialAspectPreviewUrls = mergeStringMap(
        defaultSpatialMap(),
        value.spatialAspectPreviewUrls,
      );
    }
    if (value.industryStatus) base.industryStatus = value.industryStatus;
    if (value.industryResult) base.industryResult = value.industryResult;
    if (value.typeStatus) base.typeStatus = value.typeStatus;
    if (value.typeResult) base.typeResult = value.typeResult;
    steps[key] = base;
  }
  return steps;
};

export const normalizeRecord = (record: WorkflowRecord): WorkflowRecord => ({
  ...record,
  currentStep: (record.currentStep || '').trim() || 'summary',
  steps: mergeDefaultSteps(record.steps),
  updatedAt: Date.now(),
});

/** deriveSpatialStatus —— 由 5 个空间维度状态派生 spatial 子步整体状态 */
export const deriveSpatialStatus = (statuses: Record<string, string>): string => {
  const values = SPATIAL_ASPECT_IDS.map((id) => statuses[id]);
  let hasThrough = false;
  for (const status of values) {
    if (status === '判定中') return '判定中';
    if (status === '判定不通过') return '判定不通过';
    if (status === '受限准入') return '受限准入';
    if (status === '待补充信息') return '待补充信息';
    if (status === '判定通过') hasThrough = true;
  }
  return hasThrough ? '判定通过' : '未判定';
};

/** buildAdmissionContent —— 汇总准入步骤的可读文本 */
export const buildAdmissionContent = (step: StepState): string => {
  const parts: string[] = [];
  const substeps = step.admissionSubsteps || {};
  const spatial = step.spatialAspectResults || {};
  for (const key of [
    'policy',
    'futureCity',
    'renheBase',
    'canalZone',
    'liangzhu',
    'taihu',
    'majorChange',
  ]) {
    const value = (substeps[key] || '').trim();
    if (value) parts.push(value);
  }
  for (const key of SPATIAL_ASPECT_IDS) {
    const value = (spatial[key] || '').trim();
    if (value) parts.push(value);
  }
  return parts.join('\n\n');
};

export const setIndustryRunning = (record: WorkflowRecord) => {
  const step = record.steps.industry;
  step.industryStatus = 'running';
  step.updatedAt = Date.now();
};

export const applyIndustryResult = (
  record: WorkflowRecord,
  out: { content?: string; industry_result?: IndustryResult | null },
) => {
  const step = record.steps.industry;
  step.content = (out.content || '').trim();
  step.industryStatus = 'completed';
  step.industryResult = out.industry_result || null;
  step.updatedAt = Date.now();
};

export const setTypeRunning = (record: WorkflowRecord) => {
  const step = record.steps.type;
  step.typeStatus = 'running';
  step.updatedAt = Date.now();
};

export const applyTypeResult = (
  record: WorkflowRecord,
  out: { content?: string; type_result?: TypeResult | null },
) => {
  const step = record.steps.type;
  step.content = (out.content || '').trim();
  step.typeStatus = 'completed';
  step.typeResult = out.type_result || null;
  step.updatedAt = Date.now();
};

export const setAdmissionRunning = (record: WorkflowRecord, targetId: string) => {
  const step = record.steps.admission;
  if (targetId.startsWith('spatial:')) {
    const aspectId = targetId.slice('spatial:'.length);
    step.spatialAspectStatuses![aspectId] = '判定中';
    step.admissionSubstepStatuses!.spatial = '判定中';
  } else {
    step.admissionSubstepStatuses![targetId] = '判定中';
    step.activeAdmissionSubstepId = targetId;
  }
  step.updatedAt = Date.now();
};

export const applyAdmissionResult = (
  record: WorkflowRecord,
  targetId: string,
  out: { status: string; result_description: string; map_preview_url?: string },
) => {
  const step = record.steps.admission;
  if (targetId.startsWith('spatial:')) {
    const aspectId = targetId.slice('spatial:'.length);
    step.spatialAspectStatuses![aspectId] = out.status;
    step.spatialAspectResults![aspectId] = out.result_description;
    if (!step.spatialAspectPreviewUrls) step.spatialAspectPreviewUrls = defaultSpatialMap();
    step.spatialAspectPreviewUrls[aspectId] = (out.map_preview_url || '').trim();
    step.admissionSubstepStatuses!.spatial = deriveSpatialStatus(step.spatialAspectStatuses!);
  } else {
    step.admissionSubstepStatuses![targetId] = out.status;
    step.admissionSubsteps![targetId] = out.result_description;
    step.activeAdmissionSubstepId = targetId;
  }
  step.content = buildAdmissionContent(step);
  step.updatedAt = Date.now();
};

export const applyConclusionResult = (record: WorkflowRecord, out: { content?: string }) => {
  record.completed = true;
  record.currentStep = 'conclusion';
  const step = record.steps.conclusion;
  step.content = (out.content || '').trim();
  step.updatedAt = Date.now();
};
