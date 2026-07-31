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
import type {
  AssessmentStepComponentProps,
  IndustryAnalysisResult,
  IndustryAnalysisStatus,
} from './types';

const DIALOG_TITLE = '补充行业归类信息';
const DIALOG_DESC =
  '可补充产品方案、工艺流程、原辅料、涉污工序等信息，作为行业归类分析的辅助说明。';

/** C4 行业归类分析：1:1 复刻旧 `IndustryStep.tsx` */
type IndustryStepProps = AssessmentStepComponentProps & {
  analysisResult: IndustryAnalysisResult | null;
  analysisStatus: IndustryAnalysisStatus;
  onAnalyze: () => void;
  onCancel: () => void;
  onClear: () => void;
};

const IndustryStep = memo<IndustryStepProps>(
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
          结合项目产品、工艺路线和涉污工序，辅助识别行业门类和分类编号，为后续环评类别判断提供统一口径。
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
              <div style={titleStyle}>AI行业归类</div>
              <div style={{ color: C.slate500, fontSize: 14, marginTop: 4 }}>
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
              <span>行业归类分析中，请稍候...</span>
            </div>
          ) : null}

          {analysisStatus === 'completed' && analysisResult ? (
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                marginTop: 16,
              }}
            >
              <div style={tileStyle}>
                <div style={labelStyle}>分类编号</div>
                <div style={{ color: C.slate900, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  {analysisResult.code}
                </div>
              </div>
              <div style={tileStyle}>
                <div style={labelStyle}>分类名称</div>
                <div style={{ color: C.slate900, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                  {analysisResult.name}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

IndustryStep.displayName = 'IndustryStep';

export default IndustryStep;
