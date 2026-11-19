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
