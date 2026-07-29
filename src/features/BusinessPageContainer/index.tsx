'use client';

import { Flexbox } from '@lobehub/ui';
import { createGlobalStyle } from 'antd-style';
import { memo, type ReactNode } from 'react';

/**
 * 业务页面共享容器。
 *
 * 背景：本项目未接入 Tailwind，业务页里写的 `flex`/`p-6`/`space-y-6` 等
 * 工具类原本全部无效，导致页面既没有外边距、也无法垂直卷动。
 *
 * 该容器做两件事（模式取自原生 WideScreenContainer + AgentViewAllPage）：
 * 1. 外层 Flexbox 占满高度，内层 `flex:1 + overflowY:auto` 提供页面级垂直滚动；
 *    内容区居中、限制最大宽度、四周留白。
 * 2. 注入一份全局工具类样式（仅覆盖业务页实际用到的类名，Tailwind 语义等价
 *    实现），使既有页面/弹窗（Modal/Drawer 渲染在 body portal，因此必须全局
 *    注入而非作用域注入）中的类名真正生效。
 *    经全仓扫描确认：这些类名只在 src/features/Business* 中出现，无冲突。
 */
const BizUtilityStyle = createGlobalStyle`
  /* ---- display / layout ---- */
  .flex { display: flex; }
  .inline-flex { display: inline-flex; }
  .grid { display: grid; }
  .block { display: block; }
  .inline-block { display: inline-block; }
  .flex-1 { flex: 1 1 0%; }
  .flex-col { flex-direction: column; }
  .flex-wrap { flex-wrap: wrap; }
  .shrink-0 { flex-shrink: 0; }
  .min-w-0 { min-width: 0; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .justify-start { justify-content: flex-start; }
  .justify-end { justify-content: flex-end; }
  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }

  /* ---- gap ---- */
  .gap-1 { gap: 4px; }
  .gap-1\\.5 { gap: 6px; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .gap-6 { gap: 24px; }
  .gap-x-4 { column-gap: 16px; }
  .gap-y-0 { row-gap: 0; }
  .gap-y-1 { row-gap: 4px; }

  /* ---- space-y (vertical rhythm) ---- */
  .space-y-2 > * + * { margin-top: 8px; }
  .space-y-3 > * + * { margin-top: 12px; }
  .space-y-4 > * + * { margin-top: 16px; }
  .space-y-6 > * + * { margin-top: 24px; }

  /* ---- padding ---- */
  .p-2 { padding: 8px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .p-6 { padding: 24px; }
  .px-0 { padding-inline: 0; }
  .px-3 { padding-inline: 12px; }
  .py-1\\.5 { padding-block: 6px; }
  .py-2 { padding-block: 8px; }
  .py-12 { padding-block: 48px; }
  .py-16 { padding-block: 64px; }
  .pt-2 { padding-top: 8px; }
  .pt-3 { padding-top: 12px; }
  .pr-1 { padding-right: 4px; }

  /* ---- margin ---- */
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-4 { margin-bottom: 16px; }
  .ml-2 { margin-left: 8px; }
  .ml-3 { margin-left: 12px; }
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .mt-4 { margin-top: 16px; }
  .\\!mb-0 { margin-bottom: 0 !important; }
  .\\!mb-1 { margin-bottom: 4px !important; }
  .\\!mt-0 { margin-top: 0 !important; }

  /* ---- sizing ---- */
  .w-full { width: 100%; }
  .w-2\\.5 { width: 10px; }
  .w-3 { width: 12px; }
  .w-9 { width: 36px; }
  .w-11 { width: 44px; }
  .h-full { height: 100%; }
  .h-2\\.5 { height: 10px; }
  .h-3 { height: 12px; }
  .h-9 { height: 36px; }
  .h-11 { height: 44px; }
  .h-48 { height: 192px; }
  .h-\\[360px\\] { height: 360px; }
  .max-h-\\[360px\\] { max-height: 360px; }
  .max-w-full { max-width: 100%; }

  /* ---- typography ---- */
  .text-xs { font-size: 12px; line-height: 16px; }
  .text-sm { font-size: 14px; line-height: 20px; }
  .text-base { font-size: 16px; line-height: 24px; }
  .text-4xl { font-size: 36px; line-height: 40px; }
  .text-center { text-align: center; }
  .font-medium { font-weight: 500; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .font-sans { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  .leading-6 { line-height: 24px; }
  .leading-relaxed { line-height: 1.625; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .whitespace-pre-wrap { white-space: pre-wrap; }
  .hover\\:underline:hover { text-decoration: underline; }
  .cursor-pointer { cursor: pointer; }

  /* ---- text colors ---- */
  .text-amber-500 { color: #f59e0b; }
  .text-amber-600 { color: #d97706; }
  .text-blue-500 { color: #3b82f6; }
  .text-cyan-600 { color: #0891b2; }
  .text-emerald-500 { color: #10b981; }
  .text-emerald-600 { color: #059669; }
  .text-green-500 { color: #22c55e; }
  .text-indigo-600 { color: #4f46e5; }
  .text-red-500 { color: #ef4444; }
  .text-rose-600 { color: #e11d48; }
  .text-sky-600 { color: #0284c7; }
  .text-slate-400 { color: #94a3b8; }
  .text-slate-500 { color: #64748b; }
  .text-slate-600 { color: #475569; }
  .text-slate-700 { color: #334155; }
  .text-slate-800 { color: #1e293b; }
  .text-teal-600 { color: #0d9488; }
  .text-teal-800\\/80 { color: rgba(17, 94, 89, 0.8); }
  .text-violet-600 { color: #7c3aed; }
  .hover\\:text-emerald-600:hover { color: #059669; }
  .hover\\:text-sky-600:hover { color: #0284c7; }

  /* ---- backgrounds ---- */
  .bg-white { background-color: #fff; }
  .bg-amber-50 { background-color: #fffbeb; }
  .bg-cyan-50 { background-color: #ecfeff; }
  .bg-emerald-50 { background-color: #ecfdf5; }
  .bg-green-50 { background-color: #f0fdf4; }
  .bg-indigo-50 { background-color: #eef2ff; }
  .bg-red-50 { background-color: #fef2f2; }
  .bg-rose-50 { background-color: #fff1f2; }
  .bg-sky-50 { background-color: #f0f9ff; }
  .bg-slate-50 { background-color: #f8fafc; }
  .bg-teal-50 { background-color: #f0fdfa; }
  .bg-violet-50 { background-color: #f5f3ff; }
  .bg-gradient-to-r {
    background-image: linear-gradient(
      to right,
      var(--biz-gradient-from, transparent),
      var(--biz-gradient-to, transparent)
    );
  }
  .from-teal-50 { --biz-gradient-from: #f0fdfa; }
  .to-emerald-50 { --biz-gradient-to: #ecfdf5; }

  /* ---- borders / radius / shadow ---- */
  .border { border: 1px solid #e2e8f0; }
  .border-t { border-top: 1px solid #e2e8f0; }
  .border-dashed { border-style: dashed; }
  .border-slate-100 { border-color: #f1f5f9; }
  .border-slate-300 { border-color: #cbd5e1; }
  .border-teal-100 { border-color: #ccfbf1; }
  .rounded-sm { border-radius: 2px; }
  .rounded-lg { border-radius: 8px; }
  .rounded-xl { border-radius: 12px; }
  .rounded-full { border-radius: 9999px; }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }

  /* ---- overflow ---- */
  .overflow-auto { overflow: auto; }
  .overflow-y-auto { overflow-y: auto; }

  /* ---- responsive: sm >= 640px ---- */
  @media (min-width: 640px) {
    .sm\\:flex-row { flex-direction: row; }
    .sm\\:items-center { align-items: center; }
    .sm\\:justify-start { justify-content: flex-start; }
    .sm\\:max-w-md { max-width: 448px; }
    .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sm\\:col-span-2 { grid-column: span 2 / span 2; }
  }

  /* ---- responsive: md >= 768px ---- */
  @media (min-width: 768px) {
    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .md\\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
    .md\\:col-span-3 { grid-column: span 3 / span 3; }
    .md\\:col-span-4 { grid-column: span 4 / span 4; }
    .md\\:col-span-5 { grid-column: span 5 / span 5; }
    .md\\:col-span-12 { grid-column: span 12 / span 12; }
  }

  /* ---- responsive: lg >= 1024px ---- */
  @media (min-width: 1024px) {
    .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
`;

interface BusinessPageContainerProps {
  children: ReactNode;
  /** 内容区最大宽度，默认 1280，与业务页设计稿一致 */
  maxWidth?: number;
}

const BusinessPageContainer = memo<BusinessPageContainerProps>(
  ({ children, maxWidth = 1280 }) => (
    <Flexbox height={'100%'} style={{ overflow: 'hidden', position: 'relative' }} width={'100%'}>
      <BizUtilityStyle />
      <Flexbox flex={1} style={{ overflowY: 'auto' }} width={'100%'}>
        <div
          style={{
            marginInline: 'auto',
            maxWidth,
            paddingBlock: '24px 48px',
            paddingInline: 24,
            width: '100%',
          }}
        >
          {children}
        </div>
      </Flexbox>
    </Flexbox>
  ),
);

BusinessPageContainer.displayName = 'BusinessPageContainer';

export default BusinessPageContainer;
