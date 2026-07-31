'use client';

import { memo } from 'react';

import { C, decisionTextColor, helperStyle } from '../theme';
import AdmissionSubstepEditor from './admission/AdmissionSubstepEditor';
import CanalZoneStep from './admission/CanalZoneStep';
import FutureCityStep from './admission/FutureCityStep';
import LiangzhuStep from './admission/LiangzhuStep';
import MajorChangeStep from './admission/MajorChangeStep';
import PolicyCheckStep from './admission/PolicyCheckStep';
import RenheBaseStep from './admission/RenheBaseStep';
import SpatialConflictStep from './admission/SpatialConflictStep';
import TaihuStep from './admission/TaihuStep';
import type { AdmissionStepProps } from './types';

const substepComponentMap = {
  canalZone: CanalZoneStep,
  futureCity: FutureCityStep,
  liangzhu: LiangzhuStep,
  majorChange: MajorChangeStep,
  renheBase: RenheBaseStep,
  taihu: TaihuStep,
} as const;

/**
 * C6 准入判定：1:1 复刻旧 `AdmissionStep.tsx`
 * 左侧 8 个二级步骤导航（前两项标记「必填」，右侧展示判定状态），右侧按子步骤类型渲染。
 */
const AdmissionStep = memo<AdmissionStepProps>(
  ({
    activeSubstepId,
    substepValues,
    substepStatuses,
    substeps,
    onSelectSubstep,
    onChange,
    onAnalyzeSubstep,
    onClearSubstep,
    onCancelSubstep,
    spatialAspectValues,
    spatialAspectNotes,
    spatialAspectStatuses,
    spatialAspectPreviewUrls,
    onAnalyzeSpatialAspect,
    onClearSpatialAspect,
    onCancelSpatialAspect,
    onChangeSpatialAspectNote,
    readOnly = false,
  }) => {
    const currentSubstep = substeps.find((item) => item.id === activeSubstepId) ?? substeps[0];
    const CurrentComponent =
      currentSubstep.id === 'spatial' || currentSubstep.id === 'policy'
        ? null
        : (substepComponentMap[currentSubstep.id as keyof typeof substepComponentMap] ??
          AdmissionSubstepEditor);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={helperStyle}>
          准入判定围绕产业政策、空间约束和专项规划要求开展核验。前两个二级步骤为必填项，其余步骤可根据项目实际情况补充判定。
        </div>
        <div
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'minmax(260px, 300px) minmax(0, 1fr)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {substeps.map((substep, index) => {
              const isActive = substep.id === activeSubstepId;
              const isRequired = index < 2;
              const status = substepStatuses[substep.id] ?? '未判定';
              return (
                <button
                  disabled={readOnly}
                  key={substep.id}
                  type="button"
                  style={{
                    background: isActive ? C.emerald50 : C.white,
                    border: `1px solid ${isActive ? C.emerald200 : C.slate200}`,
                    borderRadius: 12,
                    cursor: readOnly ? 'not-allowed' : 'pointer',
                    padding: '8px 12px',
                    textAlign: 'left',
                    transition: 'background-color .2s, border-color .2s',
                    width: '100%',
                  }}
                  onClick={() => onSelectSubstep(substep.id)}
                >
                  <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                    <div
                      style={{
                        alignItems: 'center',
                        background: isActive ? C.emerald600 : C.slate100,
                        borderRadius: 9999,
                        color: isActive ? C.white : C.slate500,
                        display: 'flex',
                        fontSize: 12,
                        fontWeight: 600,
                        height: 24,
                        justifyContent: 'center',
                        minWidth: 24,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div
                      style={{
                        color: isActive ? C.emerald700 : C.slate700,
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        lineHeight: '20px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {substep.title}
                    </div>
                    {isRequired ? (
                      <span
                        style={{
                          background: isActive ? C.emerald100 : C.amber50,
                          borderRadius: 9999,
                          color: isActive ? C.emerald700 : C.amber700,
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 8px',
                        }}
                      >
                        必填
                      </span>
                    ) : null}
                    <div
                      style={{
                        color: decisionTextColor(status),
                        flexShrink: 0,
                        fontSize: 12,
                        marginLeft: 'auto',
                      }}
                    >
                      {status}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {currentSubstep.id === 'spatial' ? (
            <SpatialConflictStep
              aspectNotes={spatialAspectNotes}
              aspectPreviewUrls={spatialAspectPreviewUrls}
              aspectStatuses={spatialAspectStatuses}
              aspectValues={spatialAspectValues}
              readOnly={readOnly}
              onAnalyzeAspect={onAnalyzeSpatialAspect}
              onCancelAspect={onCancelSpatialAspect}
              onChangeAspectNote={onChangeSpatialAspectNote}
              onClearAspect={onClearSpatialAspect}
            />
          ) : currentSubstep.id === 'policy' ? (
            <PolicyCheckStep
              analysisStatus={substepStatuses[currentSubstep.id] ?? '未判定'}
              placeholder={currentSubstep.placeholder}
              readOnly={readOnly}
              title={currentSubstep.title}
              value={substepValues[currentSubstep.id] || ''}
              onAnalyze={onAnalyzeSubstep}
              onCancel={onCancelSubstep}
              onChange={onChange}
              onClear={onClearSubstep}
            />
          ) : CurrentComponent ? (
            <CurrentComponent
              analysisStatus={substepStatuses[currentSubstep.id] ?? '未判定'}
              placeholder={currentSubstep.placeholder}
              readOnly={readOnly}
              title={currentSubstep.title}
              value={substepValues[currentSubstep.id] || ''}
              onAnalyze={onAnalyzeSubstep}
              onCancel={onCancelSubstep}
              onChange={onChange}
              onClear={onClearSubstep}
            />
          ) : null}
        </div>
      </div>
    );
  },
);

AdmissionStep.displayName = 'AdmissionStep';

export default AdmissionStep;
