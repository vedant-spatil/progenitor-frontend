"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/app/auth";
import {
  buttonPrimary,
  buttonSecondary,
  Card,
  ChipGroup,
  ErrorNote,
  formatTime,
  inputClass,
  PageHeader,
  StatusBadge,
} from "@/components/app/bits";
import { usePagedApi } from "@/components/app/useApi";
import { RunList } from "@/lib/api/schemas";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "queued,running", label: "Active" },
  { value: "waiting_clinician", label: "Question" },
  { value: "awaiting_review", label: "Review" },
  { value: "completed", label: "Completed" },
  { value: "failed,cancelled", label: "Failed" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

/** Runs list with filters kept in the URL (shareable): ?status=&q=&mine=1&patient=. */
export default function RunsPage() {
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = (STATUS_FILTERS.find((f) => f.value === params.get("status"))?.value ?? "") as StatusFilter;
  const q = params.get("q") ?? "";
  const mine = params.get("mine") === "1";
  const patient = params.get("patient") ?? "";
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  if (mine) query.set("mine", "1");
  if (patient) query.set("patient", patient);
  const queryString = query.toString();

  const { items: runs, next, error, more, loadMore } = usePagedApi(
    `/api/runs${queryString ? `?${queryString}` : ""}`,
    RunList,
  );
  const [search, setSearch] = useState(q);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(queryString);
    if (value) p.set(key, value);
    else p.delete(key);
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setParam("q", search.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Runs">
        {can("coordinator") && (
          <Link href="/app/runs/new" className={buttonPrimary}>
            New run
          </Link>
        )}
      </PageHeader>
      <div className="flex flex-col gap-3">
        <ChipGroup label="Run status" value={status} options={[...STATUS_FILTERS]} onChange={(v) => setParam("status", v)} />
        <div className="flex flex-wrap items-center gap-3">
          <form role="search" onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
            <label htmlFor="run-search" className="sr-only">
              Search by patient label
            </label>
            <input
              id="run-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patient label, e.g. Synthea 017"
              className={inputClass}
            />
            <button type="submit" className={buttonSecondary}>
              Search
            </button>
          </form>
          {can("coordinator") && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={mine} onChange={(e) => setParam("mine", e.target.checked ? "1" : "")} />
              Started by me
            </label>
          )}
          {patient && (
            <button type="button" className="text-sm text-accent underline" onClick={() => setParam("patient", "")}>
              Clear patient filter
            </button>
          )}
        </div>
      </div>
      {error && <ErrorNote>{error === "Could not load more." ? "Could not load more runs." : "Could not load runs."}</ErrorNote>}
      <Card title={queryString ? "Matching runs" : "Recent runs"}>
        {runs === null && !error ? (
          <p className="text-muted">Loading…</p>
        ) : runs && runs.length ? (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/runs/${r.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-accent"
                  >
                    <span className="font-semibold">{r.patient_label || `Patient ${r.patient_id}`}</span>
                    <StatusBadge status={r.status} />
                    <span className="ml-auto text-sm text-muted">{formatTime(r.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {next && (
              <div className="pt-4">
                <button type="button" onClick={loadMore} disabled={more} className={buttonSecondary}>
                  {more ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted">
            {queryString
              ? "No runs match these filters."
              : `No runs yet.${can("coordinator") ? " Start one with New run." : ""}`}
          </p>
        )}
      </Card>
    </div>
  );
}
