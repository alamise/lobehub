'use client';

import { Button } from '@lobehub/ui/base-ui';
import { Loader2, WandSparkles } from 'lucide-react';
import { memo } from 'react';

import { C, emeraldOutlineBtn, labelStyle, slateOutlineBtn, titleStyle } from '../../theme';
import SupplementInfoDialog from '../SupplementInfoDialog';
import type { AdmissionSubstepComponentProps } from '../types';

/**
 * C9 通用准入子步骤编辑器：1:1 复刻旧 `admission/AdmissionSubstepEditor.tsx`
 * futureCity / renheBase / canalZone / liangzhu / taihu / majorChange 六个子步骤复用。
 */
const AdmissionSubstepEditor = memo<AdmissionSubstepComponentProps>(
  ({
    title,
    value,
    placeholder,
    readOnly = false,
    onChange,
    analysisStatus,
    onAnalyze,
    onClear,
    onCancel,
  }) => {
    const settled = analysisStatus !== '未判定' && analysisStatus !== '判定中';
    const dialog = (
      <SupplementInfoDialog
        description="可补充专项核验背景、现场情况、比对依据或其他需要纳入判定的说明信息。"
        placeholder={placeholder}
        readOnly={readOnly}
        title={`补充${title}信息`}
        value={value}
        onChange={onChange}
      />
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <div style={titleStyle}>{title}</div>
            <div style={{ color: C.slate500, fontSize: 14, marginTop: 4 }}>
              当前判定状态：{analysisStatus}
            </div>
          </div>

          {!readOnly && analysisStatus === '未判定' ? (
            <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
              {dialog}
              <Button
                icon={<WandSparkles size={16} />}
                style={emeraldOutlineBtn}
                onClick={onAnalyze}
              >
                AI判定
              </Button>
            </div>
          ) : null}

          {!readOnly && analysisStatus === '判定中' ? (
            <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
              {dialog}
              <Button
                icon={<Loader2 className="eia-spin" size={16} />}
                style={emeraldOutlineBtn}
                onClick={onCancel}
              >
                取消判定
              </Button>
            </div>
          ) : null}

          {!readOnly && settled ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {dialog}
              <Button style={slateOutlineBtn} onClick={onClear}>
                清空
              </Button>
              <Button
                icon={<WandSparkles size={16} />}
                style={emeraldOutlineBtn}
                onClick={onAnalyze}
              >
                重新判定
              </Button>
            </div>
          ) : null}
        </div>

        {analysisStatus === '判定中' ? (
          <div
            style={{
              alignItems: 'center',
              color: C.slate600,
              display: 'flex',
              fontSize: 14,
              gap: 8,
            }}
          >
            <Loader2 className="eia-spin" color={C.emerald600} size={16} />
            <span>子步骤判定中，请稍候...</span>
          </div>
        ) : null}

        <div
          style={{
            background: C.white,
            border: `1px ${settled ? 'solid' : 'dashed'} ${C.slate200}`,
            borderRadius: 16,
            fontSize: 14,
            padding: '16px 16px',
          }}
        >
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '180px minmax(0, 1fr)' }}>
            <div>
              <div style={labelStyle}>判定状态</div>
              <div style={{ color: C.slate900, fontSize: 14, fontWeight: 500, marginTop: 8 }}>
                {analysisStatus}
              </div>
            </div>
            <div>
              <div style={labelStyle}>结果说明</div>
              <div
                style={{
                  color: settled ? C.slate700 : C.slate400,
                  lineHeight: '28px',
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {analysisStatus === '未判定'
                  ? '点击 AI判定 开始判定。'
                  : analysisStatus === '判定中'
                    ? '系统正在生成判定结果。'
                    : value || '已完成判定。'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

AdmissionSubstepEditor.displayName = 'AdmissionSubstepEditor';

export default AdmissionSubstepEditor;
