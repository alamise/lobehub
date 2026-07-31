'use client';

import type { AdmissionSubstepComponentProps } from '../types';
import AdmissionSubstepEditor from './AdmissionSubstepEditor';

/** 1:1 复刻旧 `admission/TaihuStep.tsx`：直接复用通用子步骤编辑器 */
const TaihuStep = (props: AdmissionSubstepComponentProps) => <AdmissionSubstepEditor {...props} />;

export default TaihuStep;
