/**
 * AI 环评前端状态机与派生函数
 *
 * 1:1 迁移自 legacy-go-project-monorepo/frontend/pages/approvals/assessmentShared.ts，
 * 差异点：
 * 1. 去掉 localStorage 读写与 seed 数据（新系统完全由后端驱动）；
 * 2. 去掉前端 docx 依赖（导出改由后端 GET /api/v1/ai-eia/export 产出）；
 * 3. 记录 id 为后端自增数字（number），路由基于 id。
 */

export const assessmentStepIds = [
  'summary',
  'industry',
  'type',
  'admission',
  'conclusion',
] as const;

export type AssessmentStepId = (typeof assessmentStepIds)[number];

export const admissionSubstepIds = [
  'policy',
  'spatial',
  'futureCity',
  'renheBase',
  'canalZone',
  'liangzhu',
  'taihu',
  'majorChange',
] as const;

export type AdmissionSubstepId = (typeof admissionSubstepIds)[number];

export const spatialAspectIds = [
  'threeLine',
  'ecoRedline',
  'landPlan',
  'waterProtection',
  'acousticZone',
] as const;

export type SpatialAspectId = (typeof spatialAspectIds)[number];

export const admissionDecisionStatusOptions = [
  '未判定',
  '判定中',
  '判定通过',
  '判定不通过',
  '受限准入',
  '待补充信息',
] as const;

export type AdmissionDecisionStatus = (typeof admissionDecisionStatusOptions)[number];

export type IndustryAnalysisStatus = 'idle' | 'running' | 'completed';
export type TypeAnalysisStatus = 'idle' | 'running' | 'completed';

export interface IndustryAnalysisResult {
  code: string;
  name: string;
}

export interface TypeAnalysisResult {
  materialType: string;
  submissionAllowed: string;
}

export interface AssessmentStepState {
  activeAdmissionSubstepId?: AdmissionSubstepId;
  admissionSubstepNotes?: Record<AdmissionSubstepId, string>;
  admissionSubsteps?: Record<AdmissionSubstepId, string>;
  admissionSubstepStatuses?: Record<AdmissionSubstepId, AdmissionDecisionStatus>;
  content: string;
  industryResult?: IndustryAnalysisResult | null;
  industryStatus?: IndustryAnalysisStatus;
  spatialAspectNotes?: Record<SpatialAspectId, string>;
  spatialAspectPreviewUrls?: Record<SpatialAspectId, string>;
  spatialAspectResults?: Record<SpatialAspectId, string>;
  spatialAspectStatuses?: Record<SpatialAspectId, AdmissionDecisionStatus>;
  typeResult?: TypeAnalysisResult | null;
  typeStatus?: TypeAnalysisStatus;
  updatedAt: number | null;
}

export interface AssessmentWorkflowRecord {
  bizId?: string;
  completed: boolean;
  createdAt: string | number;
  currentStep: AssessmentStepId | string;
  id: number;
  steps: Record<AssessmentStepId, AssessmentStepState>;
  summary?: string;
  updatedAt: string | number;
}

// ---------------------------------------------------------------------------
// B1. 常量：5 个主步骤 / 8 个准入子步骤 / 5 个空间维度
// ---------------------------------------------------------------------------

export const assessmentSteps = [
  {
    helper:
      '请填写项目简要说明：\n- 项目名称与建设单位\n- 建设地点\n- 建设内容与规模\n- 主要工艺与原辅料\n- 主要污染物与排放去向\n- 当前申报诉求',
    id: 'summary',
    placeholder:
      '请填写项目简要说明：\n- 项目名称与建设单位\n- 建设地点\n- 建设内容与规模\n- 主要工艺与原辅料\n- 主要污染物与排放去向\n- 当前申报诉求',
    title: '建设项目简要说明',
  },
  {
    helper: '建议从行业类别、工艺属性、涉污工序和产品特征几个方面填写，用于后续环评类别判断。',
    id: 'industry',
    placeholder:
      '请填写行业归类分析：\n- 所属行业类别\n- 主要产品或服务\n- 关键生产工艺\n- 主要原辅料及能源使用\n- 是否涉及表面处理、喷涂、电镀、酸洗等重点工序',
    title: '行业归类分析',
  },
  {
    helper: '建议说明判断依据、项目规模、污染特征以及是否存在敏感区约束。',
    id: 'type',
    placeholder:
      '请填写环评类型分析：\n- 拟判断为报告书/报告表/登记表的依据\n- 建设规模与产能\n- 污染物产生及排放特征\n- 是否位于敏感区或涉及特别管控要求',
    title: '环评类型分析',
  },
  {
    helper: '建议归纳产业政策、空间约束、规划环评、流域管控等准入条件，形成完整准入判断。',
    id: 'admission',
    placeholder:
      '请填写准入判定：\n- 产业政策符合性\n- 园区准入条件\n- 规划环评符合性\n- 空间选址约束\n- 其他专项限制条款',
    title: '准入判定',
  },
  {
    helper: '请输出最终判定意见，包含结论、风险、待补充事项和审批建议。',
    id: 'conclusion',
    placeholder: '请填写判定结果：\n- 综合判定结论\n- 主要风险点\n- 需补充材料\n- 后续审批建议',
    title: '判定结果',
  },
] as const;

export const admissionSubsteps = [
  {
    id: 'policy',
    placeholder:
      '请填写产业政策核验：\n- 是否符合产业政策\n- 是否涉及限制类/淘汰类\n- 园区准入要求\n- 政策依据条款',
    title: '产业政策核验',
  },
  {
    id: 'spatial',
    placeholder:
      '请填写空间冲突检测：\n- 项目选址位置\n- 周边敏感目标\n- 是否涉及生态红线/三线一单/饮用水源保护区\n- 冲突判断结论',
    title: '空间冲突检测',
  },
  {
    id: 'futureCity',
    placeholder:
      '请填写未来科技城规划环评判定：\n- 是否位于规划范围\n- 与规划产业定位是否匹配\n- 规划环评准入意见',
    title: '未来科技城规划环评判定',
  },
  {
    id: 'renheBase',
    placeholder:
      '请填写仁和先进制造业基地规划环评判定：\n- 是否位于基地范围\n- 是否符合基地产业导向\n- 规划环评相关要求',
    title: '仁和先进制造业基地规划环评判定',
  },
  {
    id: 'canalZone',
    placeholder:
      '请填写大运河核心监控区判定：\n- 是否涉及核心监控区\n- 是否命中负面清单\n- 合规性判断',
    title: '大运河核心监控区判定',
  },
  {
    id: 'liangzhu',
    placeholder:
      '请填写良渚遗址保护规划判定：\n- 是否涉及保护范围\n- 与保护规划关系\n- 管控要求及结论',
    title: '良渚遗址保护规划判定',
  },
  {
    id: 'taihu',
    placeholder:
      '请填写太湖流域准入判定：\n- 是否位于太湖流域\n- 是否涉及重点限制行业\n- 准入判断依据',
    title: '太湖流域准入判定',
  },
  {
    id: 'majorChange',
    placeholder:
      '请填写重大变动判定：\n- 与原环评相比的变化内容\n- 是否构成重大变动\n- 建议手续路径',
    title: '重大变动判定',
  },
] as const;

export const spatialAspects = [
  { id: 'threeLine', title: '三线一单' },
  { id: 'ecoRedline', title: '生态保护红线' },
  { id: 'landPlan', title: '国土空间规划' },
  { id: 'waterProtection', title: '饮用水保护区' },
  { id: 'acousticZone', title: '声环境功能区划' },
] as const;

/** 三个维度带地图预览（与旧系统一致） */
export const MAP_PREVIEW_ASPECT_IDS: SpatialAspectId[] = [
  'threeLine',
  'waterProtection',
  'acousticZone',
];

// ---------------------------------------------------------------------------
// B2. 状态机：空态构造 / 归一化 / 步骤跳转 / 内容写入
// ---------------------------------------------------------------------------

const buildMap = <K extends string, V>(keys: readonly K[], value: V): Record<K, V> => {
  const result = {} as Record<K, V>;
  for (const key of keys) result[key] = value;
  return result;
};

export const createEmptyAdmissionSubsteps = () => buildMap(admissionSubstepIds, '');
export const createEmptyAdmissionSubstepNotes = () => buildMap(admissionSubstepIds, '');
export const createEmptyAdmissionSubstepStatuses = () =>
  buildMap(admissionSubstepIds, '未判定' as AdmissionDecisionStatus);
export const createEmptySpatialAspectResults = () => buildMap(spatialAspectIds, '');
export const createEmptySpatialAspectNotes = () => buildMap(spatialAspectIds, '');
export const createEmptySpatialAspectPreviewUrls = () => buildMap(spatialAspectIds, '');
export const createEmptySpatialAspectStatuses = () =>
  buildMap(spatialAspectIds, '未判定' as AdmissionDecisionStatus);

export const createEmptySteps = (): Record<AssessmentStepId, AssessmentStepState> => ({
  admission: {
    activeAdmissionSubstepId: 'policy',
    admissionSubstepNotes: createEmptyAdmissionSubstepNotes(),
    admissionSubstepStatuses: createEmptyAdmissionSubstepStatuses(),
    admissionSubsteps: createEmptyAdmissionSubsteps(),
    content: '',
    spatialAspectNotes: createEmptySpatialAspectNotes(),
    spatialAspectPreviewUrls: createEmptySpatialAspectPreviewUrls(),
    spatialAspectResults: createEmptySpatialAspectResults(),
    spatialAspectStatuses: createEmptySpatialAspectStatuses(),
    updatedAt: null,
  },
  conclusion: { content: '', updatedAt: null },
  industry: { content: '', industryResult: null, industryStatus: 'idle', updatedAt: null },
  summary: { content: '', updatedAt: null },
  type: { content: '', typeResult: null, typeStatus: 'idle', updatedAt: null },
});

const createEmptyStepState = (stepId: AssessmentStepId): AssessmentStepState =>
  createEmptySteps()[stepId];

const normalizeStatus = (value: unknown): AdmissionDecisionStatus =>
  admissionDecisionStatusOptions.includes(value as AdmissionDecisionStatus)
    ? (value as AdmissionDecisionStatus)
    : '未判定';

/** 把后端返回的（可能不完整的）steps 补齐为完整状态机结构 */
export const normalizeRecord = (input: AssessmentWorkflowRecord): AssessmentWorkflowRecord => {
  const steps = createEmptySteps();
  for (const stepId of assessmentStepIds) {
    steps[stepId] = { ...steps[stepId], ...input.steps?.[stepId] };
  }

  const admission = steps.admission;
  admission.admissionSubsteps = {
    ...createEmptyAdmissionSubsteps(),
    ...admission.admissionSubsteps,
  };
  admission.admissionSubstepNotes = {
    ...createEmptyAdmissionSubstepNotes(),
    ...admission.admissionSubstepNotes,
  };
  admission.admissionSubstepStatuses = Object.fromEntries(
    admissionSubstepIds.map((id) => [
      id,
      normalizeStatus(admission.admissionSubstepStatuses?.[id]),
    ]),
  ) as Record<AdmissionSubstepId, AdmissionDecisionStatus>;
  admission.spatialAspectResults = {
    ...createEmptySpatialAspectResults(),
    ...admission.spatialAspectResults,
  };
  admission.spatialAspectNotes = {
    ...createEmptySpatialAspectNotes(),
    ...admission.spatialAspectNotes,
  };
  admission.spatialAspectPreviewUrls = {
    ...createEmptySpatialAspectPreviewUrls(),
    ...admission.spatialAspectPreviewUrls,
  };
  admission.spatialAspectStatuses = Object.fromEntries(
    spatialAspectIds.map((id) => [id, normalizeStatus(admission.spatialAspectStatuses?.[id])]),
  ) as Record<SpatialAspectId, AdmissionDecisionStatus>;
  admission.activeAdmissionSubstepId = admissionSubstepIds.includes(
    admission.activeAdmissionSubstepId as AdmissionSubstepId,
  )
    ? admission.activeAdmissionSubstepId
    : 'policy';

  return { ...input, steps };
};

export const getStepIndex = (stepId: AssessmentStepId) => assessmentStepIds.indexOf(stepId);

export const getNextStepId = (stepId: AssessmentStepId): AssessmentStepId | null =>
  assessmentStepIds[getStepIndex(stepId) + 1] ?? null;

export const getPrevStepId = (stepId: AssessmentStepId): AssessmentStepId | null => {
  const currentIndex = getStepIndex(stepId);
  return currentIndex > 0 ? assessmentStepIds[currentIndex - 1] : null;
};

export const updateAssessmentRecordStep = (
  record: AssessmentWorkflowRecord,
  stepId: AssessmentStepId,
  content: string,
): AssessmentWorkflowRecord => {
  const now = Date.now();
  const nextStepId = getNextStepId(stepId);
  return {
    ...record,
    completed: nextStepId === null,
    currentStep: nextStepId ?? 'conclusion',
    steps: {
      ...record.steps,
      [stepId]: { ...record.steps[stepId], content, updatedAt: now },
    },
    updatedAt: now,
  };
};

export const clearAssessmentRecordStepsAfter = (
  record: AssessmentWorkflowRecord,
  stepId: AssessmentStepId,
): AssessmentWorkflowRecord => {
  const currentIndex = getStepIndex(stepId);
  const nextSteps = { ...record.steps };
  for (const targetStepId of assessmentStepIds.slice(currentIndex + 1)) {
    nextSteps[targetStepId] = createEmptyStepState(targetStepId);
  }
  return { ...record, completed: false, steps: nextSteps, updatedAt: Date.now() };
};

export const finalizeAssessmentRecord = (
  record: AssessmentWorkflowRecord,
): AssessmentWorkflowRecord => {
  const now = Date.now();
  return {
    ...record,
    completed: true,
    currentStep: 'conclusion',
    steps: {
      ...record.steps,
      conclusion: {
        ...record.steps.conclusion,
        content: buildConclusionContent(record),
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
};

export const updateIndustryAnalysisState = (
  record: AssessmentWorkflowRecord,
  payload: {
    content?: string;
    result?: IndustryAnalysisResult | null;
    status: IndustryAnalysisStatus;
  },
): AssessmentWorkflowRecord => {
  const now = Date.now();
  return {
    ...record,
    steps: {
      ...record.steps,
      industry: {
        ...record.steps.industry,
        content: payload.content ?? record.steps.industry.content,
        industryResult:
          payload.result === undefined
            ? (record.steps.industry.industryResult ?? null)
            : payload.result,
        industryStatus: payload.status,
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
};

export const updateTypeAnalysisState = (
  record: AssessmentWorkflowRecord,
  payload: { content?: string; result?: TypeAnalysisResult | null; status: TypeAnalysisStatus },
): AssessmentWorkflowRecord => {
  const now = Date.now();
  return {
    ...record,
    steps: {
      ...record.steps,
      type: {
        ...record.steps.type,
        content: payload.content ?? record.steps.type.content,
        typeResult:
          payload.result === undefined ? (record.steps.type.typeResult ?? null) : payload.result,
        typeStatus: payload.status,
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
};

export const updateAdmissionSubstepState = (
  record: AssessmentWorkflowRecord,
  substepId: AdmissionSubstepId,
  content: string,
): AssessmentWorkflowRecord => {
  const now = Date.now();
  const admissionSubstepNotes = {
    ...(record.steps.admission.admissionSubstepNotes ?? createEmptyAdmissionSubstepNotes()),
    [substepId]: content,
  };
  return {
    ...record,
    steps: {
      ...record.steps,
      admission: {
        ...record.steps.admission,
        activeAdmissionSubstepId: substepId,
        admissionSubstepNotes,
        admissionSubstepStatuses:
          record.steps.admission.admissionSubstepStatuses ?? createEmptyAdmissionSubstepStatuses(),
        admissionSubsteps:
          record.steps.admission.admissionSubsteps ?? createEmptyAdmissionSubsteps(),
        content: Object.values(admissionSubstepNotes)
          .filter((item) => item.trim())
          .join('\n\n'),
        spatialAspectNotes:
          record.steps.admission.spatialAspectNotes ?? createEmptySpatialAspectNotes(),
        spatialAspectPreviewUrls:
          record.steps.admission.spatialAspectPreviewUrls ?? createEmptySpatialAspectPreviewUrls(),
        spatialAspectResults:
          record.steps.admission.spatialAspectResults ?? createEmptySpatialAspectResults(),
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
};

export const setActiveAdmissionSubstep = (
  record: AssessmentWorkflowRecord,
  substepId: AdmissionSubstepId,
): AssessmentWorkflowRecord => ({
  ...record,
  steps: {
    ...record.steps,
    admission: { ...record.steps.admission, activeAdmissionSubstepId: substepId },
  },
  updatedAt: Date.now(),
});

export const updateAdmissionSubstepAnalysisState = (
  record: AssessmentWorkflowRecord,
  substepId: AdmissionSubstepId,
  payload: { content?: string; status: AdmissionDecisionStatus },
): AssessmentWorkflowRecord => {
  const now = Date.now();
  const admissionSubsteps =
    record.steps.admission.admissionSubsteps ?? createEmptyAdmissionSubsteps();
  const admissionSubstepStatuses =
    record.steps.admission.admissionSubstepStatuses ?? createEmptyAdmissionSubstepStatuses();

  const nextSubsteps = {
    ...admissionSubsteps,
    [substepId]: payload.content === undefined ? admissionSubsteps[substepId] : payload.content,
  };
  const nextStatuses = { ...admissionSubstepStatuses, [substepId]: payload.status };

  return {
    ...record,
    steps: {
      ...record.steps,
      admission: {
        ...record.steps.admission,
        activeAdmissionSubstepId: substepId,
        admissionSubstepNotes:
          record.steps.admission.admissionSubstepNotes ?? createEmptyAdmissionSubstepNotes(),
        admissionSubstepStatuses: nextStatuses,
        admissionSubsteps: nextSubsteps,
        content: Object.values(nextSubsteps)
          .filter((item) => item.trim())
          .join('\n\n'),
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
};

export const updateSpatialAspectAnalysisState = (
  record: AssessmentWorkflowRecord,
  aspectId: SpatialAspectId,
  payload: {
    note?: string;
    previewUrl?: string;
    result?: string;
    status: AdmissionDecisionStatus;
  },
): AssessmentWorkflowRecord => {
  const now = Date.now();
  const nextResults = {
    ...(record.steps.admission.spatialAspectResults ?? createEmptySpatialAspectResults()),
    ...(payload.result === undefined ? {} : { [aspectId]: payload.result }),
  };
  const nextNotes = {
    ...(record.steps.admission.spatialAspectNotes ?? createEmptySpatialAspectNotes()),
    ...(payload.note === undefined ? {} : { [aspectId]: payload.note }),
  };
  const nextStatuses = {
    ...(record.steps.admission.spatialAspectStatuses ?? createEmptySpatialAspectStatuses()),
    [aspectId]: payload.status,
  };
  const nextPreviewUrls = {
    ...(record.steps.admission.spatialAspectPreviewUrls ?? createEmptySpatialAspectPreviewUrls()),
    ...(payload.previewUrl === undefined ? {} : { [aspectId]: payload.previewUrl }),
  };
  const nextAdmissionSubstepStatuses = {
    ...(record.steps.admission.admissionSubstepStatuses ?? createEmptyAdmissionSubstepStatuses()),
    spatial: deriveSpatialSubstepStatus(nextStatuses),
  };

  return {
    ...record,
    steps: {
      ...record.steps,
      admission: {
        ...record.steps.admission,
        admissionSubstepStatuses: nextAdmissionSubstepStatuses,
        spatialAspectNotes: nextNotes,
        spatialAspectPreviewUrls: nextPreviewUrls,
        spatialAspectResults: nextResults,
        spatialAspectStatuses: nextStatuses,
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
};

// ---------------------------------------------------------------------------
// B3. 派生函数
// ---------------------------------------------------------------------------

export const deriveSpatialSubstepStatus = (
  statuses: Record<SpatialAspectId, AdmissionDecisionStatus>,
): AdmissionDecisionStatus => {
  const values = Object.values(statuses);
  if (values.every((status) => status === '未判定')) return '未判定';
  if (values.includes('判定中')) return '判定中';
  if (values.includes('判定不通过')) return '判定不通过';
  if (values.includes('受限准入')) return '受限准入';
  if (values.includes('待补充信息')) return '待补充信息';
  if (values.includes('未判定')) return '未判定';
  return '判定通过';
};

export const formatAdmissionDecisionStatus = (
  status: AdmissionDecisionStatus | string | null | undefined,
): string => status || '未判定';

export type AssessmentFinalDecision = '通过' | '受限准入' | '未通过' | '待补充信息';

const toFinalDecision = (status: string): AssessmentFinalDecision => {
  if (status === '待补充信息' || status === '未判定' || status === '判定中') return '待补充信息';
  if (status === '判定不通过' || status === '未通过') return '未通过';
  if (status === '受限准入') return '受限准入';
  return '通过';
};

export const deriveAssessmentFinalDecision = (
  record: AssessmentWorkflowRecord,
): AssessmentFinalDecision => {
  const requiredDecisions: AssessmentFinalDecision[] = [
    record.steps.industry.industryStatus === 'completed' && record.steps.industry.industryResult
      ? '通过'
      : '待补充信息',
  ];

  const submissionAllowed = record.steps.type.typeResult?.submissionAllowed;
  requiredDecisions.push(
    submissionAllowed === '允许'
      ? '通过'
      : submissionAllowed === '不允许'
        ? '未通过'
        : '待补充信息',
  );

  requiredDecisions.push(
    toFinalDecision(record.steps.admission.admissionSubstepStatuses?.policy ?? '未判定'),
    toFinalDecision(record.steps.admission.admissionSubstepStatuses?.spatial ?? '未判定'),
  );

  if (requiredDecisions.includes('待补充信息')) return '待补充信息';
  if (requiredDecisions.includes('未通过')) return '未通过';
  if (requiredDecisions.includes('受限准入')) return '受限准入';
  return '通过';
};

export const buildConclusionContent = (record: AssessmentWorkflowRecord): string => {
  const sections: string[] = [`一、建设项目简要说明\n${record.steps.summary.content || '未填写'}`];

  const industryResult = record.steps.industry.industryResult;
  sections.push(
    `二、行业归类分析\n${
      industryResult
        ? `分类编号：${industryResult.code}\n分类名称：${industryResult.name}`
        : '未分析'
    }`,
  );

  const typeResult = record.steps.type.typeResult;
  sections.push(
    `三、环评类型分析\n${typeResult ? `提交材料类型：${typeResult.materialType || '—'}` : '未分析'}`,
  );

  const admissionLines = admissionSubsteps.map((substep, index) => {
    if (substep.id === 'spatial') {
      const aspectLines = spatialAspects.map((aspect, aspectIndex) => {
        const status = formatAdmissionDecisionStatus(
          record.steps.admission.spatialAspectStatuses?.[aspect.id],
        );
        const description = record.steps.admission.spatialAspectResults?.[aspect.id] || '未判定';
        return `  ${index + 1}.${aspectIndex + 1} ${aspect.title}：${status} / ${description}`;
      });
      const status = formatAdmissionDecisionStatus(
        record.steps.admission.admissionSubstepStatuses?.[substep.id],
      );
      return [`${index + 1}. ${substep.title}（${status}）`, ...aspectLines].join('\n');
    }

    const status = formatAdmissionDecisionStatus(
      record.steps.admission.admissionSubstepStatuses?.[substep.id],
    );
    const result = record.steps.admission.admissionSubsteps?.[substep.id] || '未判定';
    return `${index + 1}. ${substep.title}（${status}）\n  ${result}`;
  });
  sections.push(`四、准入判定\n${admissionLines.join('\n')}`);

  sections.push(`五、综合判定结论\n${deriveAssessmentFinalDecision(record)}`);

  return sections.join('\n\n');
};

const hasCompletedIndustry = (record: AssessmentWorkflowRecord) =>
  record.steps.industry.industryStatus === 'completed' &&
  Boolean(record.steps.industry.industryResult);

const hasCompletedType = (record: AssessmentWorkflowRecord) =>
  record.steps.type.typeStatus === 'completed' && Boolean(record.steps.type.typeResult);

const isResolvedStatus = (status: string) => status !== '未判定' && status !== '判定中';

const hasCompletedRequiredAdmission = (record: AssessmentWorkflowRecord) => {
  const statuses = record.steps.admission.admissionSubstepStatuses;
  return (
    isResolvedStatus(statuses?.policy ?? '未判定') &&
    isResolvedStatus(statuses?.spatial ?? '未判定')
  );
};

export const resolveAssessmentRecordStep = (record: AssessmentWorkflowRecord): AssessmentStepId => {
  if (record.completed || record.currentStep === 'conclusion') return 'conclusion';
  if (assessmentStepIds.includes(record.currentStep as AssessmentStepId)) {
    return record.currentStep as AssessmentStepId;
  }
  if (!hasCompletedIndustry(record)) return 'industry';
  if (!hasCompletedType(record)) return 'type';
  if (!hasCompletedRequiredAdmission(record)) return 'admission';
  return 'conclusion';
};

/** 列表页“继续判定 / 查看详情”跳转目标 */
export const getAssessmentRecordRoute = (record: AssessmentWorkflowRecord) =>
  `/approval/eia/${record.id}/edit/${resolveAssessmentRecordStep(record)}`;

export const isAssessmentStepId = (value: string | undefined): value is AssessmentStepId =>
  Boolean(value && assessmentStepIds.includes(value as AssessmentStepId));

/** 准入子步骤 / 空间维度状态对应的展示色（浅色主题） */
export const decisionStatusColor = (status: string): string => {
  switch (status) {
    case '判定通过': {
      return '#059669';
    }
    case '判定中': {
      return '#d97706';
    }
    case '受限准入': {
      return '#ea580c';
    }
    case '判定不通过': {
      return '#e11d48';
    }
    case '待补充信息': {
      return '#d97706';
    }
    default: {
      return '#94a3b8';
    }
  }
};
