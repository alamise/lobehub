'use client';

import { Button } from '@lobehub/ui/base-ui';
import { Loader2, WandSparkles } from 'lucide-react';
import { memo } from 'react';

import {
  C,
  emeraldOutlineBtn,
  helperStyle,
  labelStyle,
  slateOutlineBtn,
  softCardStyle,
  tileStyle,
  titleStyle,
} from '../theme';
import SupplementInfoDialog from './SupplementInfoDialog';
import type { AssessmentStepComponentProps, TypeAnalysisResult, TypeAnalysisStatus } from './types';

const DIALOG_TITLE = '补充环评类型分析信息';
const DIALOG_DESC =
  '可补充项目规模、污染物特征、敏感区情况和名录适用口径，作为材料类型判断的辅助说明。';

/** C5 环评类型分析：1:1 复刻旧 `TypeStep.tsx` */
type TypeStepProps = AssessmentStepComponentProps & {
  analysisResult: TypeAnalysisResult | null;
  analysisStatus: TypeAnalysisStatus;
  onAnalyze: () => void;
  onCancel: () => void;
  onClear: () => void;
};

const TypeStep = memo<TypeStepProps>(
  ({
    title,
    value,
    onChange,
    placeholder,
    readOnly = false,
    analysisStatus,
    analysisResult,
    onAnalyze,
    onClear,
    onCancel,
  }) => {
    const dialog = (
      <SupplementInfoDialog
        description={DIALOG_DESC}
        placeholder={placeholder}
        readOnly={readOnly}
        title={DIALOG_TITLE}
        value={value}
        onChange={onChange}
      />
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={titleStyle}>{title}</div>
        <div style={helperStyle}>
          基于行业归类、项目规模、污染特征和名录口径，辅助判断项目应当提交的环评材料类型。
        </div>

        <div style={softCardStyle}>
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
              <div style={{ color: C.slate500, fontSize: 14 }}>
                当前状态：
                {analysisStatus === 'idle'
                  ? '未分析'
                  : analysisStatus === 'running'
                    ? '分析中'
                    : '已分析'}
              </div>
            </div>

            {!readOnly && analysisStatus === 'idle' ? (
              <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
                {dialog}
                <Button
                  icon={<WandSparkles size={16} />}
                  style={emeraldOutlineBtn}
                  onClick={onAnalyze}
                >
                  AI分析
                </Button>
              </div>
            ) : null}

            {!readOnly && analysisStatus === 'running' ? (
              <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
                {dialog}
                <Button
                  icon={<Loader2 className="eia-spin" size={16} />}
                  style={emeraldOutlineBtn}
                  onClick={onCancel}
                >
                  取消分析
                </Button>
              </div>
            ) : null}

            {!readOnly && analysisStatus === 'completed' ? (
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
                  重新分析
                </Button>
              </div>
            ) : null}
          </div>

          {analysisStatus === 'running' ? (
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
              <span>环评类型分析中，请稍候...</span>
            </div>
          ) : null}

          {analysisStatus === 'completed' && analysisResult ? (
            <div style={{ marginTop: 16 }}>
              <div style={tileStyle}>
                <div style={labelStyle}>提交材料类型</div>
                <div style={{ color: C.slate900, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  {analysisResult.materialType || '—'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

TypeStep.displayName = 'TypeStep';

export default TypeStep;
