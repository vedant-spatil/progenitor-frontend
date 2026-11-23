"use client";

import { useRef, type KeyboardEvent } from "react";

export type SegmentOption = { id: string; label: string };

/** Tabs styled as a segmented control. Arrow keys, Home and End move the selection (automatic activation). */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  panelId,
}: {
  options: readonly SegmentOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  panelId: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );

  function onKeyDown(e: KeyboardEvent) {
    const last = options.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? current === last
          ? 0
          : current + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? current === 0
            ? last
            : current - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="grid w-full grid-cols-3 gap-1 rounded-xl border border-line bg-card-raised p-1 md:inline-flex md:w-auto md:shrink-0"
    >
      {options.map((o, i) => {
        const selected = i === current;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`tab-${o.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.id)}
            className={`rounded-lg px-2 py-2 text-sm leading-tight transition-colors md:px-5 md:py-2.5 md:text-lg md:whitespace-nowrap ${
              selected ? "bg-bg font-bold text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
