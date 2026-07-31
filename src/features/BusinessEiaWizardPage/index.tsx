'use client';

import { Button } from '@lobehub/ui/base-ui';
import { message } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  analyzeEia,
  createEia,
  getEia,
  getEiaAuthToken,
  updateEia,
} from '@/features/BusinessEiaPage/api';
import EiaSteps from '@/features/BusinessEiaPage/EiaSteps';
import type {
  AdmissionSubstepId,
  AssessmentStepId,
  AssessmentWorkflowRecord,
  SpatialAspectId,
} from '@/features/BusinessEiaPage/shared';
import {
  admissionSubsteps,
  assessmentSteps,
  clearAssessmentRecordStepsAfter,
  createEmptyAdmissionSubsteps,
  createEmptyAdmissionSubstepStatuses,
  createEmptySpatialAspectNotes,
  createEmptySpatialAspectPreviewUrls,
  createEmptySpatialAspectResults,
  createEmptySpatialAspectStatuses,
  getNextStepId,
  getPrevStepId,
  getStepIndex,
  isAssessmentStepId,
  updateAdmissionSubstepAnalysisState,
  updateAdmissionSubstepState,
  updateAssessmentRecordStep,
  updateIndustryAnalysisState,
  updateSpatialAspectAnalysisState,
  updateTypeAnalysisState,
} from '@/features/BusinessEiaPage/shared';
import AdmissionStep from '@/features/BusinessEiaPage/steps/AdmissionStep';
import ConclusionStep from '@/features/BusinessEiaPage/steps/ConclusionStep';
import IndustryStep from '@/features/BusinessEiaPage/steps/IndustryStep';
import SummaryStep from '@/features/BusinessEiaPage/steps/SummaryStep';
import TypeStep from '@/features/BusinessEiaPage/steps/TypeStep';
import { C } from '@/features/BusinessEiaPage/theme';
import BusinessPageContainer from '@/features/BusinessPageContainer';
import { useSession } from '@/libs/better-auth/auth-client';

const LIST_ROUTE = '/approval/eia';

const isAbortError = (error: unknown) =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');

/**
 * C2 AI 环评向导页：1:1 复刻旧 `pages/approvals/Assessment.tsx`
 * 面包屑 + 5 步步骤条 + 各步骤组件 + 底部「上一步 / 保存并下一步（保存并完成）」。
 */
const BusinessEiaWizardPage = memo(() => {
  const navigate = useNavigate();
  const { recordId, stepId } = useParams();
  const { data: session } = useSession();
  const authToken = getEiaAuthToken(session);
  const isNewRecord = !recordId;

  const [record, setRecord] = useState<AssessmentWorkflowRecord | null>(null);
  const [loading, setLoading] = useState(!isNewRecord);
  const [hasLoadedRecord, setHasLoadedRecord] = useState(isNewRecord);
  const analyzeAbortControllerRef = useRef<AbortController | null>(null);

  const currentStepId: AssessmentStepId = isAssessmentStepId(stepId) ? stepId : 'summary';
  const currentStep = assessmentSteps.find((step) => step.id === currentStepId);
  const resolvedAdmissionSubstepId = record?.steps.admission.activeAdmissionSubstepId ?? 'policy';
  const initialValue =
    isNewRecord || !record || !currentStep
      ? ''
      : currentStepId === 'admission'
        ? (record.steps.admission.admissionSubstepNotes?.[resolvedAdmissionSubstepId] ?? '')
        : record.steps[currentStepId].content;
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isNewRecord || !recordId) {
      setRecord(null);
      setLoading(false);
      setHasLoadedRecord(true);
      return;
    }
    setHasLoadedRecord(false);
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const nextRecord = await getEia(Number(recordId), authToken);
        if (!cancelled) setRecord(nextRecord);
      } catch (error) {
        if (!cancelled) message.error(error instanceof Error ? error.message : '加载记录失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoadedRecord(true);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authToken, isNewRecord, recordId]);

  useEffect(() => {
    if (!currentStep) navigate('/approval/eia/new', { replace: true });
  }, [currentStep, navigate]);

  useEffect(() => {
    if (!isNewRecord && hasLoadedRecord && !loading && !record) {
      navigate(LIST_ROUTE, { replace: true });
    }
  }, [hasLoadedRecord, isNewRecord, loading, navigate, record]);

  const saveRecord = useCallback(
    async (nextRecord: AssessmentWorkflowRecord) => {
      const saved = await updateEia(
        nextRecord.id,
        {
          completed: nextRecord.completed,
          currentStep: nextRecord.currentStep,
          steps: nextRecord.steps,
        },
        authToken,
      );
      setRecord(saved);
      return saved;
    },
    [authToken],
  );

  const resetAnalyzeAbortController = () => {
    analyzeAbortControllerRef.current = null;
  };

  const createAnalyzeAbortController = () => {
    analyzeAbortControllerRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortControllerRef.current = controller;
    return controller;
  };

  if (!currentStep) return null;

  const industryState = record?.steps.industry;
  const typeState = record?.steps.type;
  const admissionState = record?.steps.admission;
  const activeAdmissionSubstepId: AdmissionSubstepId =
    admissionState?.activeAdmissionSubstepId ?? 'policy';
  const spatialAspectValues =
    admissionState?.spatialAspectResults ?? createEmptySpatialAspectResults();
  const spatialAspectNotes = admissionState?.spatialAspectNotes ?? createEmptySpatialAspectNotes();
  const spatialAspectStatuses =
    admissionState?.spatialAspectStatuses ?? createEmptySpatialAspectStatuses();
  const spatialAspectPreviewUrls =
    admissionState?.spatialAspectPreviewUrls ?? createEmptySpatialAspectPreviewUrls();

  const policyStatus = admissionState?.admissionSubstepStatuses?.policy ?? '未判定';
  const spatialStatus = admissionState?.admissionSubstepStatuses?.spatial ?? '未判定';
  const requiredAdmissionCompleted =
    policyStatus !== '未判定' &&
    policyStatus !== '判定中' &&
    spatialStatus !== '未判定' &&
    spatialStatus !== '判定中';

  const canProceed =
    (currentStepId !== 'industry' ||
      (industryState?.industryStatus === 'completed' && !!industryState.industryResult)) &&
    (currentStepId !== 'type' || (typeState?.typeStatus === 'completed' && !!typeState.typeResult));

  const handleSaveAndNext = async () => {
    try {
      if (currentStepId === 'conclusion') {
        navigate(LIST_ROUTE);
        return;
      }
      if (currentStepId === 'summary' && !value.trim()) {
        message.error('请先填写项目简要说明');
        return;
      }
      if (currentStepId === 'admission' && !requiredAdmissionCompleted) {
        message.error('必须完成前两步方可继续');
        return;
      }

      setLoading(true);
      if (isNewRecord) {
        const created = await createEia(value.trim(), authToken);
        setRecord(created);
        navigate(`/approval/eia/${created.id}/edit/industry`);
        return;
      }
      if (!record) return;

      if (currentStepId === 'admission') {
        const draft = updateAdmissionSubstepState(record, activeAdmissionSubstepId, value.trim());
        const savedDraft = await saveRecord({ ...draft, currentStep: 'conclusion' });
        const finalRecord = await analyzeEia({
          authToken,
          id: savedDraft.id,
          stepId: 'conclusion',
        });
        setRecord(finalRecord);
        navigate(`/approval/eia/${savedDraft.id}/edit/conclusion`);
        return;
      }

      const shouldClearFollowingSteps =
        (currentStepId === 'summary' && value.trim() !== record.steps.summary.content) ||
        (currentStepId === 'industry' && value.trim() !== record.steps.industry.content);

      let nextRecord = updateAssessmentRecordStep(record, currentStepId, value.trim());
      if (shouldClearFollowingSteps) {
        nextRecord = clearAssessmentRecordStepsAfter(nextRecord, currentStepId);
      }
      const saved = await saveRecord(nextRecord);
      const nextStepId = getNextStepId(currentStepId);
      if (nextStepId) {
        navigate(`/approval/eia/${saved.id}/edit/${nextStepId}`);
        return;
      }
      navigate(LIST_ROUTE);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = async () => {
    const prevStepId = getPrevStepId(currentStepId);
    if (!prevStepId) return;
    if (isNewRecord) {
      navigate('/approval/eia/new');
      return;
    }
    if (!record) return;
    try {
      setLoading(true);
      const updatedRecord: AssessmentWorkflowRecord =
        currentStepId === 'admission'
          ? {
              ...updateAdmissionSubstepState(record, activeAdmissionSubstepId, value.trim()),
              currentStep: prevStepId,
            }
          : {
              ...record,
              currentStep: prevStepId,
              steps: {
                ...record.steps,
                [currentStepId]: {
                  ...record.steps[currentStepId],
                  content: value.trim(),
                  updatedAt: Date.now(),
                },
              },
              updatedAt: Date.now(),
            };
      const saved = await saveRecord(updatedRecord);
      navigate(`/approval/eia/${saved.id}/edit/${prevStepId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleIndustryAnalyze = async () => {
    if (!record || currentStepId !== 'industry') return;
    try {
      setLoading(true);
      const runningRecord = updateIndustryAnalysisState(record, {
        content: value.trim(),
        status: 'running',
      });
      const saved = await saveRecord(runningRecord);
      const controller = createAnalyzeAbortController();
      const analyzed = await analyzeEia({
        authToken,
        id: saved.id,
        signal: controller.signal,
        stepId: 'industry',
      });
      setRecord(analyzed);
    } catch (error) {
      if (isAbortError(error)) {
        message.info('已取消行业归类分析');
        return;
      }
      message.error(error instanceof Error ? error.message : 'AI分析失败');
    } finally {
      resetAnalyzeAbortController();
      setLoading(false);
    }
  };

  const handleIndustryClear = async () => {
    if (!record || currentStepId !== 'industry') return;
    try {
      setLoading(true);
      await saveRecord(
        updateIndustryAnalysisState(record, { content: '', result: null, status: 'idle' }),
      );
      setValue('');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空失败');
    } finally {
      setLoading(false);
    }
  };

  const handleIndustryAnalyzeCancel = async () => {
    if (!record || currentStepId !== 'industry') return;
    analyzeAbortControllerRef.current?.abort();
    resetAnalyzeAbortController();
    try {
      setLoading(true);
      await saveRecord(updateIndustryAnalysisState(record, { status: 'idle' }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeAnalyze = async () => {
    if (!record || currentStepId !== 'type') return;
    try {
      setLoading(true);
      const runningRecord = updateTypeAnalysisState(record, {
        content: value.trim(),
        status: 'running',
      });
      const saved = await saveRecord(runningRecord);
      const controller = createAnalyzeAbortController();
      const analyzed = await analyzeEia({
        authToken,
        id: saved.id,
        signal: controller.signal,
        stepId: 'type',
      });
      setRecord(analyzed);
    } catch (error) {
      if (isAbortError(error)) {
        message.info('已取消环评类型分析');
        return;
      }
      message.error(error instanceof Error ? error.message : 'AI分析失败');
    } finally {
      resetAnalyzeAbortController();
      setLoading(false);
    }
  };

  const handleTypeClear = async () => {
    if (!record || currentStepId !== 'type') return;
    try {
      setLoading(true);
      await saveRecord(
        updateTypeAnalysisState(record, { content: '', result: null, status: 'idle' }),
      );
      setValue('');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeAnalyzeCancel = async () => {
    if (!record || currentStepId !== 'type') return;
    analyzeAbortControllerRef.current?.abort();
    resetAnalyzeAbortController();
    try {
      setLoading(true);
      await saveRecord(updateTypeAnalysisState(record, { status: 'idle' }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmissionSubstepSelect = async (targetSubstepId: AdmissionSubstepId) => {
    if (!record || currentStepId !== 'admission') return;
    try {
      setLoading(true);
      const savedCurrent = updateAdmissionSubstepState(record, activeAdmissionSubstepId, value);
      const saved = await saveRecord({
        ...savedCurrent,
        steps: {
          ...savedCurrent.steps,
          admission: {
            ...savedCurrent.steps.admission,
            activeAdmissionSubstepId: targetSubstepId,
          },
        },
      });
      setValue(saved.steps.admission.admissionSubstepNotes?.[targetSubstepId] || '');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '切换失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmissionAnalyze = async () => {
    if (!record || currentStepId !== 'admission') return;
    try {
      setLoading(true);
      const draftRecord = updateAdmissionSubstepState(
        record,
        activeAdmissionSubstepId,
        value.trim(),
      );
      const runningRecord = updateAdmissionSubstepAnalysisState(
        draftRecord,
        activeAdmissionSubstepId,
        { status: '判定中' },
      );
      const saved = await saveRecord(runningRecord);
      const controller = createAnalyzeAbortController();
      const analyzed = await analyzeEia({
        authToken,
        id: saved.id,
        signal: controller.signal,
        stepId: 'admission',
        targetId: activeAdmissionSubstepId,
      });
      setRecord(analyzed);
    } catch (error) {
      if (isAbortError(error)) {
        message.info('已取消准入判定');
        return;
      }
      message.error(error instanceof Error ? error.message : 'AI判定失败');
    } finally {
      resetAnalyzeAbortController();
      setLoading(false);
    }
  };

  const handleAdmissionClear = async () => {
    if (!record || currentStepId !== 'admission') return;
    try {
      setLoading(true);
      const saved = await saveRecord(
        updateAdmissionSubstepAnalysisState(record, activeAdmissionSubstepId, {
          content: '',
          status: '未判定',
        }),
      );
      setValue(saved.steps.admission.admissionSubstepNotes?.[activeAdmissionSubstepId] || '');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmissionAnalyzeCancel = async () => {
    if (!record || currentStepId !== 'admission') return;
    analyzeAbortControllerRef.current?.abort();
    resetAnalyzeAbortController();
    try {
      setLoading(true);
      await saveRecord(
        updateAdmissionSubstepAnalysisState(record, activeAdmissionSubstepId, {
          status: '未判定',
        }),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSpatialAspectAnalyze = async (aspectId: SpatialAspectId) => {
    if (!record || currentStepId !== 'admission') return;
    try {
      setLoading(true);
      const draftRecord = updateAdmissionSubstepState(
        record,
        activeAdmissionSubstepId,
        value.trim(),
      );
      const runningRecord = updateSpatialAspectAnalysisState(draftRecord, aspectId, {
        previewUrl: '',
        status: '判定中',
      });
      const saved = await saveRecord(runningRecord);
      const controller = createAnalyzeAbortController();
      const analyzed = await analyzeEia({
        authToken,
        id: saved.id,
        signal: controller.signal,
        stepId: 'admission',
        targetId: `spatial:${aspectId}`,
      });
      setRecord(analyzed);
    } catch (error) {
      if (isAbortError(error)) {
        message.info('已取消空间冲突判定');
        return;
      }
      message.error(error instanceof Error ? error.message : 'AI判定失败');
    } finally {
      resetAnalyzeAbortController();
      setLoading(false);
    }
  };

  const handleSpatialAspectAnalyzeCancel = async (aspectId: SpatialAspectId) => {
    if (!record || currentStepId !== 'admission') return;
    analyzeAbortControllerRef.current?.abort();
    resetAnalyzeAbortController();
    try {
      setLoading(true);
      await saveRecord(
        updateSpatialAspectAnalysisState(record, aspectId, { previewUrl: '', status: '未判定' }),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSpatialAspectClear = async (aspectId: SpatialAspectId) => {
    if (!record || currentStepId !== 'admission') return;
    try {
      setLoading(true);
      await saveRecord(
        updateSpatialAspectAnalysisState(record, aspectId, {
          previewUrl: '',
          result: '',
          status: '未判定',
        }),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSpatialAspectNoteChange = async (aspectId: SpatialAspectId, nextValue: string) => {
    if (!record || currentStepId !== 'admission') return;
    try {
      await saveRecord(
        updateSpatialAspectAnalysisState(record, aspectId, {
          note: nextValue,
          status: spatialAspectStatuses[aspectId],
        }),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存补充信息失败');
    }
  };

  const actionLabel = getNextStepId(currentStepId) === null ? '保存并完成' : '保存并下一步';
  const prevStepId = getPrevStepId(currentStepId);

  return (
    <BusinessPageContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            alignItems: 'center',
            color: C.slate500,
            display: 'flex',
            fontSize: 14,
            gap: 8,
          }}
        >
          <span>首页</span>
          <ChevronRight size={16} />
          <span>AI辅助审批</span>
          <ChevronRight size={16} />
          <span>AI环评智库</span>
          <ChevronRight size={16} />
          <span style={{ color: C.slate700 }}>AI环评</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ color: C.slate900, fontSize: 24, fontWeight: 600 }}>AI环评</div>

          <EiaSteps current={getStepIndex(currentStepId)} items={assessmentSteps} />

          {loading && !isNewRecord && !record ? (
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.slate200}`,
                borderRadius: 16,
                color: C.slate500,
                fontSize: 14,
                padding: '40px 16px',
                textAlign: 'center',
              }}
            >
              正在加载环评判定记录...
            </div>
          ) : null}

          {currentStepId === 'summary' ? (
            <SummaryStep
              placeholder={currentStep.placeholder}
              stepId={currentStep.id}
              title={currentStep.title}
              value={value}
              onChange={setValue}
            />
          ) : null}

          {currentStepId === 'industry' ? (
            <IndustryStep
              analysisResult={industryState?.industryResult ?? null}
              analysisStatus={industryState?.industryStatus ?? 'idle'}
              placeholder={currentStep.placeholder}
              stepId={currentStep.id}
              title={currentStep.title}
              value={value}
              onAnalyze={handleIndustryAnalyze}
              onCancel={handleIndustryAnalyzeCancel}
              onChange={setValue}
              onClear={handleIndustryClear}
            />
          ) : null}

          {currentStepId === 'type' ? (
            <TypeStep
              analysisResult={typeState?.typeResult ?? null}
              analysisStatus={typeState?.typeStatus ?? 'idle'}
              placeholder={currentStep.placeholder}
              stepId={currentStep.id}
              title={currentStep.title}
              value={value}
              onAnalyze={handleTypeAnalyze}
              onCancel={handleTypeAnalyzeCancel}
              onChange={setValue}
              onClear={handleTypeClear}
            />
          ) : null}

          {currentStepId === 'admission' ? (
            <AdmissionStep
              activeSubstepId={activeAdmissionSubstepId}
              placeholder={currentStep.placeholder}
              spatialAspectNotes={spatialAspectNotes}
              spatialAspectPreviewUrls={spatialAspectPreviewUrls}
              spatialAspectStatuses={spatialAspectStatuses}
              spatialAspectValues={spatialAspectValues}
              stepId={currentStep.id}
              substepValues={admissionState?.admissionSubsteps ?? createEmptyAdmissionSubsteps()}
              substeps={admissionSubsteps}
              title={currentStep.title}
              value={value}
              substepStatuses={
                admissionState?.admissionSubstepStatuses ?? createEmptyAdmissionSubstepStatuses()
              }
              onAnalyzeSpatialAspect={handleSpatialAspectAnalyze}
              onAnalyzeSubstep={handleAdmissionAnalyze}
              onCancelSpatialAspect={handleSpatialAspectAnalyzeCancel}
              onCancelSubstep={handleAdmissionAnalyzeCancel}
              onChange={setValue}
              onChangeSpatialAspectNote={handleSpatialAspectNoteChange}
              onClearSpatialAspect={handleSpatialAspectClear}
              onClearSubstep={handleAdmissionClear}
              onSelectSubstep={handleAdmissionSubstepSelect}
            />
          ) : null}

          {currentStepId === 'conclusion' && record ? <ConclusionStep record={record} /> : null}
        </div>

        {currentStepId === 'conclusion' ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {prevStepId ? (
                  <Button
                    icon={<ChevronLeft size={16} />}
                    style={{ minWidth: 112 }}
                    onClick={handlePrev}
                  >
                    上一步
                  </Button>
                ) : null}
              </div>
              <Button
                disabled={loading || (currentStepId !== 'admission' && !canProceed)}
                style={{ background: C.emerald600, minWidth: 144 }}
                type="primary"
                onClick={handleSaveAndNext}
              >
                {loading ? '处理中...' : actionLabel}
              </Button>
            </div>

            {currentStepId === 'industry' && !canProceed ? (
              <div style={{ color: C.amber600, fontSize: 14 }}>
                请先完成 AI 分析并拿到分类编号、分类名称后，再进入下一步。
              </div>
            ) : null}
            {currentStepId === 'type' && !canProceed ? (
              <div style={{ color: C.amber600, fontSize: 14 }}>
                请先完成 AI 分析并拿到「提交材料类型」结果后，再进入下一步。
              </div>
            ) : null}
            {currentStepId === 'admission' && !requiredAdmissionCompleted ? (
              <div style={{ color: C.amber600, fontSize: 14 }}>
                前两个二级步骤为必填项，必须完成前两步方可继续；其余 6 个二级步骤为选填。
              </div>
            ) : null}
          </div>
        )}
      </div>
    </BusinessPageContainer>
  );
});

BusinessEiaWizardPage.displayName = 'BusinessEiaWizardPage';

export default BusinessEiaWizardPage;
