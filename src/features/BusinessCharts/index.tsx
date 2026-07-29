'use client';

import { memo } from 'react';

/* 零依赖 SVG 图表组件，供环保助手决策组静态页复用（项目未引入 recharts/echarts）。 */

export interface BarDatum {
  label: string;
  value: number;
}

export const MiniBarChart = memo<{
  data: BarDatum[];
  colors?: string[];
  height?: number;
  valueSuffix?: string;
}>(({ data, colors, height = 300, valueSuffix = '' }) => {
  const palette = colors || [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#14b8a6',
    '#f43f5e',
  ];
  const W = 640;
  const H = height;
  const padX = 44;
  const padTop = 24;
  const padBottom = 52;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const band = innerW / Math.max(data.length, 1);
  const barW = Math.min(46, band * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padTop + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#eef2f6" strokeWidth={1} />
            <text x={padX - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = padX + band * i + (band - barW) / 2;
        const y = padTop + innerH - h;
        const color = palette[i % palette.length];
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx={4} fill={color} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={600}>
              {d.value}
              {valueSuffix}
            </text>
            <text
              x={x + barW / 2}
              y={H - padBottom + 18}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

export interface LineSeries {
  name: string;
  color: string;
  data: number[];
}

export const MiniLineChart = memo<{
  series: LineSeries[];
  labels: string[];
  height?: number;
}>(({ series, labels, height = 300 }) => {
  const W = 660;
  const H = height;
  const padX = 44;
  const padTop = 24;
  const padBottom = 48;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const xAt = (i: number) => (labels.length <= 1 ? padX + innerW / 2 : padX + (innerW * i) / (labels.length - 1));
  const yAt = (v: number) => padTop + innerH * (1 - (v - min) / span);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#eef2f6" strokeWidth={1} />
              <text x={padX - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
                {Math.round((min + span * t) * 10) / 10}
              </text>
            </g>
          );
        })}
        {series.map((s) => {
          const pts = s.data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
          return (
            <g key={s.name}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} />
              {s.data.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r={3} fill={s.color} />
              ))}
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text
            key={l}
            x={xAt(i)}
            y={H - padBottom + 20}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
          >
            {l}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
});

export interface PieDatum {
  label: string;
  value: number;
  color: string;
}

export const MiniPieChart = memo<{
  data: PieDatum[];
  height?: number;
}>(({ data, height = 300 }) => {
  const W = 260;
  const H = height;
  const cx = W / 2;
  const cy = H / 2;
  const r = 104;
  const innerR = 56;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;

  const slices = data.map((d) => {
    const frac = d.value / total;
    const a0 = angle;
    const a1 = angle + frac * 2 * Math.PI;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const xi1 = cx + innerR * Math.cos(a1);
    const yi1 = cy + innerR * Math.sin(a1);
    const xi0 = cx + innerR * Math.cos(a0);
    const yi0 = cy + innerR * Math.sin(a0);
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${innerR} ${innerR} 0 ${large} 0 ${xi0} ${yi0} Z`;
    const pct = Math.round(frac * 1000) / 10;
    return { ...d, path, pct };
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }} role="img">
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill={s.color}>
            <title>{`${s.label}: ${s.value} (${s.pct}%)`}</title>
          </path>
        ))}
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
            <span className="text-slate-400">{s.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
});

export default MiniBarChart;
