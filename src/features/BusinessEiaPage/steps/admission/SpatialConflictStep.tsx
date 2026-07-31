'use client';

import { Button } from '@lobehub/ui/base-ui';
import { Loader2, WandSparkles } from 'lucide-react';
import { memo } from 'react';

import type { AdmissionDecisionStatus, SpatialAspectId } from '../../shared';
import {
  formatAdmissionDecisionStatus,
  MAP_PREVIEW_ASPECT_IDS,
  spatialAspects,
} from '../../shared';
import { C, emeraldOutlineBtn, labelStyle, slateOutlineBtn, titleStyle } from '../../theme';
import SupplementInfoDialog from '../SupplementInfoDialog';

const NOTE_PLACEHOLDER = '可补充选址情况、敏感点说明、现场核对信息等。';
const NOTE_DESC =
  '可补充选址情况、敏感点分布、规划衔接依据和现场核查信息，作为专项判定的辅助说明。';

/**
 * C8 空间冲突检测：1:1 复刻旧 `admission/SpatialConflictStep.tsx`
 * 5 个维度循环渲染；threeLine / waterProtection / acousticZone 三项在判定完成后展示地图 iframe。
 */
interface SpatialConflictStepProps {
  aspectNotes: Record<SpatialAspectId, string>;
  aspectPreviewUrls: Record<SpatialAspectId, string>;
  aspectStatuses: Record<SpatialAspectId, AdmissionDecisionStatus>;
  aspectValues: Record<SpatialAspectId, string>;
  onAnalyzeAspect: (aspectId: SpatialAspectId) => void;
  onCancelAspect: (aspectId: SpatialAspectId) => void;
  onChangeAspectNote: (aspectId: SpatialAspectId, value: string) => void;
  onClearAspect: (aspectId: SpatialAspectId) => void;
  readOnly?: boolean;
}

const SpatialConflictStep = memo<SpatialConflictStepProps>(
  ({
    readOnly = false,
    aspectValues,
    aspectNotes,
    aspectStatuses,
    aspectPreviewUrls,
    onAnalyzeAspect,
    onClearAspect,
    onCancelAspect,
    onChangeAspectNote,
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={titleStyle}>空间冲突检测</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {spatialAspects.map((aspect) => {
          const status = aspectStatuses[aspect.id] ?? '未判定';
          const decisionStatus = formatAdmissionDecisionStatus(status);
          const resultDescription = aspectValues[aspect.id] || '';
          const note = aspectNotes[aspect.id] || '';
          const previewUrl = aspectPreviewUrls[aspect.id] || '';
          const settled = status !== '未判定' && status !== '判定中';
          const dialog = (
            <SupplementInfoDialog
              description={NOTE_DESC}
              placeholder={NOTE_PLACEHOLDER}
              readOnly={readOnly}
              title={`补充${aspect.title}信息`}
              value={note}
              onChange={(nextValue) => onChangeAspectNote(aspect.id, nextValue)}
            />
          );

          return (
            <div
              key={aspect.id}
              style={{
                background: C.slate50,
                border: `1px solid ${C.slate200}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={titleStyle}>{aspect.title}</div>
                </div>

                {!readOnly && status === '未判定' ? (
                  <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
                    {dialog}
                    <Button
                      icon={<WandSparkles size={16} />}
                      style={emeraldOutlineBtn}
                      onClick={() => onAnalyzeAspect(aspect.id)}
                    >
                      AI判定
                    </Button>
                  </div>
                ) : null}

                {!readOnly && status === '判定中' ? (
                  <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
                    {dialog}
                    <Button
                      icon={<Loader2 className="eia-spin" size={16} />}
                      style={emeraldOutlineBtn}
                      onClick={() => onCancelAspect(aspect.id)}
                    >
                      取消判定
                    </Button>
                  </div>
                ) : null}

                {!readOnly && settled ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dialog}
                    <Button style={slateOutlineBtn} onClick={() => onClearAspect(aspect.id)}>
                      清空
                    </Button>
                    <Button
                      icon={<WandSparkles size={16} />}
                      style={emeraldOutlineBtn}
                      onClick={() => onAnalyzeAspect(aspect.id)}
                    >
                      重新判定
                    </Button>
                  </div>
                ) : null}
              </div>

              {status === '判定中' ? (
                <div
                  style={{
                    alignItems: 'center',
                    color: C.slate600,
                    display: 'flex',
                    fontSize: 14,
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <Loader2 className="eia-spin" color={C.emerald600} size={16} />
                  <span>{aspect.title}分析中，请稍候...</span>
                </div>
              ) : null}

              <div
                style={{
                  background: C.white,
                  border: `1px ${settled ? 'solid' : 'dashed'} ${C.slate200}`,
                  borderRadius: 16,
                  color: settled ? C.slate700 : C.slate400,
                  fontSize: 14,
                  marginTop: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  }}
                >
                  <div>
                    <div style={labelStyle}>判定状态</div>
                    <div style={{ color: C.slate900, fontSize: 14, fontWeight: 500, marginTop: 8 }}>
                      {decisionStatus}
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>结果说明</div>
                    <div style={{ lineHeight: '28px', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                      {settled
                        ? resultDescription || '已完成判定。'
                        : status === '判定中'
                          ? '系统正在生成空间冲突检测结果。'
                          : '点击 AI判定 开始判定。'}
                    </div>
                  </div>
                </div>

                {MAP_PREVIEW_ASPECT_IDS.includes(aspect.id) && previewUrl && settled ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={labelStyle}>地图预览</div>
                    <iframe
                      src={previewUrl}
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
            </div>
          );
        })}
      </div>
    </div>
  ),
);

SpatialConflictStep.displayName = 'SpatialConflictStep';

export default SpatialConflictStep;
