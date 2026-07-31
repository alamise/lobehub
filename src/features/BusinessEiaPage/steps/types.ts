import type {
  AdmissionDecisionStatus,
  AdmissionSubstepId,
  AssessmentStepId,
  IndustryAnalysisResult,
  IndustryAnalysisStatus,
  SpatialAspectId,
  TypeAnalysisResult,
  TypeAnalysisStatus,
} from '../shared';

export type {
  IndustryAnalysisResult,
  IndustryAnalysisStatus,
  TypeAnalysisResult,
  TypeAnalysisStatus,
};

export interface AssessmentStepComponentProps {
  onChange: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
  stepId: AssessmentStepId;
  title: string;
  value: string;
}

export interface AdmissionSubstepComponentProps {
  analysisStatus: AdmissionDecisionStatus;
  onAnalyze: () => void;
  onCancel?: () => void;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  readOnly?: boolean;
  title: string;
  value: string;
}

export type AdmissionStepProps = AssessmentStepComponentProps & {
  activeSubstepId: AdmissionSubstepId;
  onAnalyzeSpatialAspect: (aspectId: SpatialAspectId) => void;
  onAnalyzeSubstep: () => void;
  onCancelSpatialAspect: (aspectId: SpatialAspectId) => void;
  onCancelSubstep: () => void;
  onChangeSpatialAspectNote: (aspectId: SpatialAspectId, value: string) => void;
  onClearSpatialAspect: (aspectId: SpatialAspectId) => void;
  onClearSubstep: () => void;
  onSelectSubstep: (substepId: AdmissionSubstepId) => void;
  spatialAspectNotes: Record<SpatialAspectId, string>;
  spatialAspectPreviewUrls: Record<SpatialAspectId, string>;
  spatialAspectStatuses: Record<SpatialAspectId, AdmissionDecisionStatus>;
  spatialAspectValues: Record<SpatialAspectId, string>;
  substepStatuses: Record<AdmissionSubstepId, AdmissionDecisionStatus>;
  substepValues: Record<AdmissionSubstepId, string>;
  substeps: ReadonlyArray<{
    id: AdmissionSubstepId;
    placeholder: string;
    title: string;
  }>;
};
