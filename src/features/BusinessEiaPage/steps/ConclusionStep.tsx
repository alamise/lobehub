'use client';

import { memo } from 'react';

import type { AssessmentWorkflowRecord } from '../shared';
import {
  admissionSubsteps,
  deriveAssessmentFinalDecision,
  formatAdmissionDecisionStatus,
  MAP_PREVIEW_ASPECT_IDS,
  spatialAspects,
} from '../shared';
import { C, conclusionTheme, labelStyle, titleStyle } from '../theme';

/**
 * C10 判定结果：1:1 复刻旧 `ConclusionStep.tsx`
 * 结论四色卡片 + 建设项目简要说明 + 行业归类 + 环评类型 + 准入判定回顾（含空间维度地图回放）。
 */
interface ConclusionStepProps {
  record: AssessmentWorkflowRecord;
}

const sectionStyle = {
  background: C.white,
  border: `1px solid ${C.slate200}`,
  borderRadius: 16,
  padding: 20,
} as const;

const ConclusionStep = memo<ConclusionStepProps>(({ record }) => {
  const admissionDecision = deriveAssessmentFinalDecision(record);
  const theme = conclusionTheme(admissionDecision);
  const admission = record.steps.admission;

  const visibleSpatialAspects = spatialAspects.filter(
    (aspect) =>
      (admission.spatialAspectStatuses?.[aspect.id] ?? '未判定') !== '未判定' ||
      Boolean(admission.spatialAspectResults?.[aspect.id]?.trim()),
  );
  const visibleAdmissionSubsteps = admissionSubsteps.filter((substep) => {
    if (substep.id === 'spatial') return visibleSpatialAspects.length > 0;
    return (admission.admissionSubstepStatuses?.[substep.id] ?? '未判定') !== '未判定';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section
        style={{
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ color: C.slate700, fontSize: 14, fontWeight: 500 }}>结论</div>
        <div
          style={{
            alignItems: 'flex-end',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'space-between',
            marginTop: 12,
          }}
        >
          <div>
            <div
              style={{
                color: C.slate900,
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: '-0.025em',
              }}
            >
              {admissionDecision}
            </div>
          </div>
          <span
            style={{
              background: C.white,
              border: `1px solid ${theme.border}`,
              borderRadius: 9999,
              color: theme.text,
              display: 'inline-flex',
              fontSize: 14,
              fontWeight: 500,
              padding: '4px 12px',
            }}
          >
            {theme.badge}
          </span>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        <section style={sectionStyle}>
          <div style={titleStyle}>建设项目简要说明</div>
          <div
            style={{
              color: C.slate600,
              fontSize: 14,
              lineHeight: '28px',
              marginTop: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {record.steps.summary.content || '未填写'}
          </div>
        </section>

        {record.steps.industry.industryResult ? (
          <section style={sectionStyle}>
            <div style={titleStyle}>行业归类分析</div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                marginTop: 12,
              }}
            >
              <div
                style={{
                  background: C.slate50,
                  border: `1px solid ${C.slate200}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                }}
              >
                <div style={labelStyle}>分类编号</div>
                <div style={{ color: C.slate900, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  {record.steps.industry.industryResult.code}
                </div>
              </div>
              <div
                style={{
                  background: C.slate50,
                  border: `1px solid ${C.slate200}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                }}
              >
                <div style={labelStyle}>分类名称</div>
                <div style={{ color: C.slate900, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  {record.steps.industry.industryResult.name}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {record.steps.type.typeResult ? (
        <section style={sectionStyle}>
          <div style={titleStyle}>环评类型分析</div>
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                background: C.slate50,
                border: `1px solid ${C.slate200}`,
                borderRadius: 12,
                padding: '12px 16px',
              }}
            >
              <div style={labelStyle}>提交材料类型</div>
              <div style={{ color: C.slate900, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                {record.steps.type.typeResult.materialType || '—'}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {visibleAdmissionSubsteps.length > 0 ? (
        <section style={sectionStyle}>
          <div style={titleStyle}>准入判定</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {visibleAdmissionSubsteps.map((substep, index) => (
              <div
                key={substep.id}
                style={{
                  background: C.slate50,
                  border: `1px solid ${C.slate200}`,
                  borderRadius: 12,
                  padding: '16px 16px',
                }}
              >
                <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <div
                    style={{
                      alignItems: 'center',
                      background: C.slate900,
                      borderRadius: 9999,
                      color: C.white,
                      display: 'flex',
                      fontSize: 12,
                      fontWeight: 600,
                      height: 24,
                      justifyContent: 'center',
                      width: 24,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={titleStyle}>{substep.title}</div>
                </div>

                {substep.id === 'spatial' ? (
                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                      marginTop: 12,
                    }}
                  >
                    {visibleSpatialAspects.map((aspect) => (
                      <div
                        key={aspect.id}
                        style={{
                          background: C.white,
                          border: `1px solid ${C.slate200}`,
                          borderRadius: 12,
                          padding: '12px 16px',
                        }}
                      >
                        <div style={titleStyle}>{aspect.title}</div>
                        <div
                          style={{
                            display: 'grid',
                            gap: 12,
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            marginTop: 12,
                          }}
                        >
                          <div>
                            <div style={labelStyle}>判定状态</div>
                            <div
                              style={{
                                color: C.slate900,
                                fontSize: 14,
                                fontWeight: 500,
                                marginTop: 8,
                              }}
                            >
                              {formatAdmissionDecisionStatus(
                                admission.spatialAspectStatuses?.[aspect.id],
                              )}
                            </div>
                          </div>
                          <div>
                            <div style={labelStyle}>结果说明</div>
                            <div
                              style={{
                                color: C.slate600,
                                fontSize: 14,
                                lineHeight: '28px',
                                marginTop: 8,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {admission.spatialAspectResults?.[aspect.id] || '未判定'}
                            </div>
                          </div>
                        </div>
                        {MAP_PREVIEW_ASPECT_IDS.includes(aspect.id) &&
                        admission.spatialAspectPreviewUrls?.[aspect.id] ? (
                          <div style={{ marginTop: 12 }}>
                            <div style={labelStyle}>地图预览</div>
                            <iframe
                              src={admission.spatialAspectPreviewUrls[aspect.id]}
                              title={`${aspect.title}地图预览`}
                              style={{
                                border: `1px solid ${C.slate200}`,
                                borderRadius: 12,
                                height: 400,
                                marginTop: 8,
                                maxWidth: '100%',
                                width: 600,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: '180px minmax(0, 1fr)',
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        background: C.white,
                        border: `1px solid ${C.slate200}`,
                        borderRadius: 12,
                        padding: '12px 16px',
                      }}
                    >
                      <div style={labelStyle}>判定状态</div>
                      <div
                        style={{ color: C.slate900, fontSize: 14, fontWeight: 500, marginTop: 8 }}
                      >
                        {formatAdmissionDecisionStatus(
                          admission.admissionSubstepStatuses?.[substep.id],
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        background: C.white,
                        border: `1px solid ${C.slate200}`,
                        borderRadius: 12,
                        padding: '12px 16px',
                      }}
                    >
                      <div style={labelStyle}>结果说明</div>
                      <div
                        style={{
                          color: C.slate600,
                          fontSize: 14,
                          lineHeight: '28px',
                          marginTop: 8,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {admission.admissionSubsteps?.[substep.id] || '未判定'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
});

ConclusionStep.displayName = 'ConclusionStep';

export default ConclusionStep;
