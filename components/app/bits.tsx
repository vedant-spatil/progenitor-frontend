import Link from "next/link";
import type { ReactNode } from "react";
import type { RunStatus } from "@/lib/api/schemas";

const STATUS_LABEL: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  waiting_clinician: "Question for clinician",
  awaiting_review: "Awaiting review",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<RunStatus, string> = {
  queued: "bg-card-raised text-muted",
  running: "bg-accent-soft text-accent",
  waiting_clinician: "bg-accent-soft text-accent",
  awaiting_review: "bg-accent-soft text-accent",
  completed: "bg-card-raised text-success",
  failed: "bg-card-raised text-danger",
  cancelled: "bg-card-raised text-muted",
};

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card" aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-card-raised px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink disabled:opacity-50";
export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 hover:border-fg/40 disabled:opacity-50";
export const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-fg placeholder:text-muted focus-visible:border-accent";

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export const RUN_STATUSES = Object.keys(STATUS_LABEL) as RunStatus[];
export function statusLabel(status: RunStatus): string {
  return STATUS_LABEL[status];
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

/** Loading, error and empty states shared by the list pages. */
export function LoadState({ loading, error, empty }: { loading: boolean; error: string; empty?: ReactNode }) {
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading) return <p className="text-muted">Loading…</p>;
  return empty ? <p className="text-muted">{empty}</p> : null;
}

/** Wide tables scroll inside their card, never the page. */
export function Table({ caption, head, children }: { caption: string; head: ReactNode[]; children: ReactNode }) {
  return (
    // Focusable so keyboard users can scroll a wide table on small screens.
    <div className="relative -mx-5 overflow-x-auto px-5" tabIndex={0} role="group" aria-label={`${caption} (scrolls sideways)`}>
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
            {head.map((h, i) => (
              <th key={i} scope="col" className="py-2 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
export const td = "py-2.5 pr-4 align-top";

/** A row of filter chips (one choice). Renders as radio buttons for keyboard and screen-reader users. */
export function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="cursor-pointer rounded-full border border-line px-3 py-1 text-sm text-muted has-checked:border-accent has-checked:bg-accent-soft has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          <input
            type="radio"
            name={label}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

export function Stat({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
    </>
  );
  const cls = "flex flex-col gap-1 rounded-2xl border border-line bg-card px-5 py-4";
  return href ? (
    <Link href={href} className={`${cls} hover:border-fg/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Verdict counts of a shortlisted trial, e.g. "2 met · 1 unknown". */
export function Counts({ counts }: { counts: Record<string, number> }) {
  const order = ["met", "not_met", "unknown", "not_applicable"];
  const parts = order.filter((k) => counts[k]).map((k) => `${counts[k]} ${k.replace("_", " ")}`);
  return parts.length ? <span className="text-xs text-muted">{parts.join(" · ")}</span> : null;
}
