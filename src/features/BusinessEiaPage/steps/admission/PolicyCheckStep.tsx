'use client';

import { Button } from '@lobehub/ui/base-ui';
import { Loader2, WandSparkles } from 'lucide-react';
import { memo } from 'react';

import type { AdmissionDecisionStatus } from '../../shared';
import { C, emeraldOutlineBtn, labelStyle, slateOutlineBtn, titleStyle } from '../../theme';
import SupplementInfoDialog from '../SupplementInfoDialog';

const DIALOG_TITLE = '补充产业政策核验信息';
const DIALOG_DESC = '可补充项目所属行业、政策依据、准入背景和需要重点说明的核验信息。';

/** C7 产业政策核验：1:1 复刻旧 `admission/PolicyCheckStep.tsx` */
interface PolicyCheckStepProps {
  analysisStatus: AdmissionDecisionStatus;
  onAnalyze: () => void;
  onCancel?: () => void;
  onChange?: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  readOnly?: boolean;
  title: string;
  value?: string;
}

const PolicyCheckStep = memo<PolicyCheckStepProps>(
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
        description={DIALOG_DESC}
        placeholder={placeholder ?? ''}
        readOnly={readOnly}
        title={DIALOG_TITLE}
        value={value ?? ''}
        onChange={(nextValue) => onChange?.(nextValue)}
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
            <span>产业政策核验中，请稍候...</span>
          </div>
        ) : null}

        <div
          style={{
            background: C.white,
            border: `1px solid ${C.slate200}`,
            borderRadius: 16,
            fontSize: 14,
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
                {analysisStatus}
              </div>
            </div>
            <div>
              <div style={labelStyle}>结果说明</div>
              <div
                style={{
                  color: C.slate700,
                  lineHeight: '28px',
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {analysisStatus === '未判定'
                  ? '点击 AI判定 开始判定。'
                  : analysisStatus === '判定中'
                    ? '系统正在生成产业政策核验结果。'
                    : value || '已完成判定。'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

PolicyCheckStep.displayName = 'PolicyCheckStep';

export default PolicyCheckStep;
