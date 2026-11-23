"use client";

import { useState } from "react";

export type Series = { key: string; label: string; color: string };
export type Group = { key: string; label: string; values: Record<string, number | null | undefined> };

const W = 640;
const H = 260;
const M = { top: 24, right: 8, bottom: 36, left: 40 };
const GAP = 2; // surface gap between adjacent bars
const TICKS = [0, 0.25, 0.5, 0.75, 1];

/** Bar with 4px rounded top corners, anchored square to the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Grouped bar chart on a 0-1 scale (NDCG, P@5, MRR). One bar per series per group, values labelled above
 * the bars, legend above the plot, hover or focus shows the exact value. The page also shows the table.
 */
export function EvalChart({ title, series, groups }: { title: string; series: Series[]; groups: Group[] }) {
  const [hover, setHover] = useState<{ g: string; s: string } | null>(null);
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const groupW = plotW / Math.max(1, groups.length);
  const inner = Math.min(groupW * 0.7, series.length * 44);
  const barW = (inner - GAP * (series.length - 1)) / series.length;
  const y = (v: number) => M.top + plotH * (1 - Math.max(0, Math.min(1, v)));
  const active = hover ? groups.find((g) => g.key === hover.g) : undefined;
  const activeSeries = hover ? series.find((s) => s.key === hover.s) : undefined;
  const activeValue = active && activeSeries ? active.values[activeSeries.key] : undefined;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <ul className="flex flex-wrap gap-4 text-sm text-muted" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </figcaption>
      <p className="h-5 text-sm tabular-nums" aria-live="polite">
        {active && activeSeries
          ? `${active.label} · ${activeSeries.label}: ${typeof activeValue === "number" ? activeValue.toFixed(3) : "n/a"}`
          : ""}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`${title}. Values are listed in the table below.`}>
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const x0 = M.left + gi * groupW + (groupW - inner) / 2;
          return (
            <g key={g.key}>
              {series.map((s, si) => {
                const v = g.values[s.key];
                if (typeof v !== "number") return null;
                const x = x0 + si * (barW + GAP);
                const top = y(v);
                const on = hover?.g === g.key && hover.s === s.key;
                return (
                  <g
                    key={s.key}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${g.label}, ${s.label}: ${v.toFixed(3)}`}
                    onMouseEnter={() => setHover({ g: g.key, s: s.key })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ g: g.key, s: s.key })}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  >
                    {/* Hit target taller than the bar. */}
                    <rect x={x} y={M.top} width={barW} height={plotH} fill="transparent" />
                    <path
                      d={barPath(x, top, barW, M.top + plotH - top)}
                      fill={s.color}
                      opacity={hover && !on ? 0.45 : 1}
                      stroke={on ? "var(--fg)" : "none"}
                      strokeWidth={on ? 1.5 : 0}
                    />
                    <text x={x + barW / 2} y={top - 6} textAnchor="middle" fontSize={10} fill="var(--fg)" className="tabular-nums">
                      {v.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text x={M.left + gi * groupW + groupW / 2} y={H - M.bottom + 20} textAnchor="middle" fontSize={12} fill="var(--muted)">
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
