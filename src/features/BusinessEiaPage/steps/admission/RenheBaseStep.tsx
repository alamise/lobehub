'use client';

import type { AdmissionSubstepComponentProps } from '../types';
import AdmissionSubstepEditor from './AdmissionSubstepEditor';

/** 1:1 复刻旧 `admission/RenheBaseStep.tsx`：直接复用通用子步骤编辑器 */
const RenheBaseStep = (props: AdmissionSubstepComponentProps) => (
  <AdmissionSubstepEditor {...props} />
);

export default RenheBaseStep;
