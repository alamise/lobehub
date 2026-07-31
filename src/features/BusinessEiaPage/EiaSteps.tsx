'use client';

import { memo } from 'react';

import { C } from './theme';

/**
 * C12 步骤条：1:1 复刻旧 `components/ui/steps.tsx`
 * - 当前步：emerald600 实心圆 + 白字，标题 slate900 加粗
 * - 已完成：emerald50 底 + emerald200 描边 + emerald700 字，分隔线 emerald200
 * - 未开始：白底 + slate200 描边 + slate500 字，分隔线 slate200
 */
interface EiaStepsProps {
  current: number;
  items: ReadonlyArray<{ id: string; title: string }>;
}

const EiaSteps = memo<EiaStepsProps>(({ current, items }) => (
  <ol
    style={{
      display: 'flex',
      gap: 16,
      listStyle: 'none',
      margin: 0,
      overflowX: 'auto',
      paddingBottom: 4,
      paddingInlineStart: 0,
      width: '100%',
    }}
  >
    {items.map((item, index) => {
      const isCompleted = index < current;
      const isCurrent = index === current;
      return (
        <li
          key={item.id}
          style={{ alignItems: 'center', display: 'flex', flex: '1 1 0%', gap: 16, minWidth: 0 }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: 12, minWidth: 0 }}>
            <div
              style={{
                alignItems: 'center',
                background: isCurrent ? C.emerald600 : isCompleted ? C.emerald50 : C.white,
                border: `1px solid ${isCurrent ? C.emerald600 : isCompleted ? C.emerald200 : C.slate200}`,
                borderRadius: 9999,
                color: isCurrent ? C.white : isCompleted ? C.emerald700 : C.slate500,
                display: 'flex',
                flexShrink: 0,
                fontSize: 14,
                fontWeight: 600,
                height: 36,
                justifyContent: 'center',
                width: 36,
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                color: isCurrent ? C.slate900 : isCompleted ? C.slate700 : C.slate500,
                fontSize: 14,
                fontWeight: isCurrent ? 600 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              {item.title}
            </div>
          </div>
          <div
            style={{
              background: isCompleted ? C.emerald200 : C.slate200,
              flex: 1,
              height: 1,
              minWidth: 16,
            }}
          />
        </li>
      );
    })}
  </ol>
));

EiaSteps.displayName = 'EiaSteps';

export default EiaSteps;
