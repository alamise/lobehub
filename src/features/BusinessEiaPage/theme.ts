/**
 * AI 环评页面配色与通用样式常量。
 *
 * 旧系统用 Tailwind（slate / emerald / amber / rose / orange 色阶），本项目未接入
 * Tailwind，这里把用到的色值固化为常量，配合内联样式实现 1:1 视觉还原。
 */

import type { CSSProperties } from 'react';

export const C = {
  amber200: '#fde68a',
  amber50: '#fffbeb',
  amber600: '#d97706',
  amber700: '#b45309',
  emerald100: '#d1fae5',
  emerald200: '#a7f3d0',
  emerald50: '#ecfdf5',
  emerald600: '#059669',
  emerald700: '#047857',
  orange200: '#fed7aa',
  orange50: '#fff7ed',
  orange600: '#ea580c',
  orange700: '#c2410c',
  rose200: '#fecdd3',
  rose50: '#fff1f2',
  rose600: '#e11d48',
  rose700: '#be123c',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate50: '#f8fafc',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0f172a',
  white: '#ffffff',
} as const;

/** 卡片：白底 + slate200 描边 + 圆角 16px */
export const cardStyle: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.slate200}`,
  borderRadius: 16,
};

/** 浅灰卡片：slate50 底 */
export const softCardStyle: CSSProperties = {
  background: C.slate50,
  border: `1px solid ${C.slate200}`,
  borderRadius: 16,
  padding: 16,
};

/** 小卡：白底 + 圆角 12px */
export const tileStyle: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.slate200}`,
  borderRadius: 12,
  padding: '12px 16px',
};

export const labelStyle: CSSProperties = { color: C.slate400, fontSize: 12 };

export const titleStyle: CSSProperties = {
  color: C.slate900,
  fontSize: 14,
  fontWeight: 500,
};

export const helperStyle: CSSProperties = {
  color: C.slate500,
  fontSize: 14,
  lineHeight: '28px',
};

/** AI 分析 / AI 判定按钮（emerald 描边） */
export const emeraldOutlineBtn: CSSProperties = {
  borderColor: C.emerald200,
  color: C.emerald700,
};

/** 清空按钮（slate 描边） */
export const slateOutlineBtn: CSSProperties = {
  borderColor: C.slate200,
  color: C.slate700,
};

/** 危险按钮（rose 描边） */
export const roseOutlineBtn: CSSProperties = {
  borderColor: C.rose200,
  color: C.rose700,
};

/** 判定状态 → 文本颜色（子步骤导航右侧状态字） */
export const decisionTextColor = (status: string): string => {
  switch (status) {
    case '判定通过': {
      return C.emerald600;
    }
    case '判定中': {
      return C.amber600;
    }
    case '受限准入': {
      return C.orange600;
    }
    case '判定不通过': {
      return C.rose600;
    }
    default: {
      return C.slate400;
    }
  }
};

/** 结论四色主题（通过 / 受限准入 / 待补充信息 / 未通过） */
export const conclusionTheme = (decision: string) => {
  switch (decision) {
    case '通过': {
      return { badge: '允许准入', bg: C.emerald50, border: C.emerald200, text: C.emerald700 };
    }
    case '受限准入': {
      return { badge: '受限准入', bg: C.orange50, border: C.orange200, text: C.orange700 };
    }
    case '待补充信息': {
      return { badge: '待补充后复核', bg: C.amber50, border: C.amber200, text: C.amber700 };
    }
    default: {
      return { badge: '不予准入', bg: C.rose50, border: C.rose200, text: C.rose700 };
    }
  }
};
