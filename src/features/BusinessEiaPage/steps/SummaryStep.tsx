'use client';

import { Input } from 'antd';
import { memo } from 'react';

import { C, helperStyle, titleStyle } from '../theme';
import type { AssessmentStepComponentProps } from './types';

/** C3 建设项目简要说明：1:1 复刻旧 `SummaryStep.tsx` */
const SummaryStep = memo<AssessmentStepComponentProps>(
  ({ title, value, placeholder, readOnly = false, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={titleStyle}>{title}</div>
      <div style={helperStyle}>
        请尽量完整填写项目名称、建设地点、建设内容、主要工艺及申报背景。该信息将作为后续行业归类、环评类型分析和准入判定的基础输入。
      </div>
      <Input.TextArea
        placeholder={placeholder}
        readOnly={readOnly}
        rows={10}
        value={value}
        style={{
          background: C.white,
          borderColor: C.slate200,
          borderRadius: 16,
          lineHeight: '28px',
          padding: '12px 16px',
        }}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  ),
);

SummaryStep.displayName = 'SummaryStep';

export default SummaryStep;
