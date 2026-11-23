"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonSecondary, Card, ChipGroup, inputClass, LoadState, PageHeader } from "@/components/app/bits";
import { useApi } from "@/components/app/useApi";
import { TrialList, type TrialRow } from "@/lib/api/schemas";

/** Trial registry copy (ClinicalTrials.gov snapshot). Filters live in the URL: ?q=&status=&shortlisted=1&page=. */
export default function TrialsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const shortlisted = params.get("shortlisted") === "1" ? "1" : "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (shortlisted) query.set("shortlisted", "1");
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  const { data, error, loading } = useApi(`/api/trials${qs ? `?${qs}` : ""}`, TrialList);
  const [search, setSearch] = useState(q);

  function go(changes: Record<string, string>) {
    const p = new URLSearchParams(qs);
    if (!("page" in changes)) p.delete("page");
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    go({ q: search.trim() });
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trials" />
      <div className="flex flex-col gap-3">
        <ChipGroup
          label="Which trials"
          value={shortlisted}
          options={[
            { value: "", label: "All trials" },
            { value: "1", label: "Shortlisted for a patient" },
          ]}
          onChange={(v) => go({ shortlisted: v })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <form role="search" onSubmit={submit} className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
            <label htmlFor="trial-search" className="sr-only">
              Search trials
            </label>
            <input
              id="trial-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="NCT id, title or condition"
              className={inputClass}
            />
            <button type="submit" className={buttonSecondary}>
              Search
            </button>
          </form>
          <label className="flex items-center gap-2 text-sm text-muted">
            Status
            <select value={status} onChange={(e) => go({ status: e.target.value })} className={`${inputClass} w-auto`}>
              <option value="">Any</option>
              {data?.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <Card title={data ? `${data.total} trials` : "Trials"}>
        <LoadState loading={loading} error={error} empty={data && !data.items.length ? "No trials match." : undefined} />
        {data && data.items.length > 0 && (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.items.map((t) => (
                <TrialCard key={t.nct_id} trial={t} />
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="Trial pages" className="flex items-center gap-3 pt-4 text-sm">
                <button type="button" className={buttonSecondary} disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>
                  Previous
                </button>
                <span className="text-muted">
                  Page {page} of {pages}
                </span>
                <button type="button" className={buttonSecondary} disabled={page >= pages} onClick={() => go({ page: String(page + 1) })}>
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function TrialCard({ trial: t }: { trial: TrialRow }) {
  const ages = [t.minimum_age, t.maximum_age].some(Boolean) ? `${t.minimum_age || "any"} to ${t.maximum_age || "any"}` : "";
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Link href={`/app/trials/${t.nct_id}`} className="font-mono text-accent underline">
          {t.nct_id}
        </Link>
        {t.overall_status && <span className="rounded-full bg-card-raised px-2 py-0.5 text-xs">{t.overall_status}</span>}
        {t.phases.length > 0 && <span className="text-xs text-muted">{t.phases.join(", ")}</span>}
      </div>
      <p className="font-semibold">{t.title || "Untitled"}</p>
      {t.conditions.length > 0 && <p className="text-sm text-muted">{t.conditions.slice(0, 4).join(" · ")}</p>}
      <p className="mt-auto text-xs text-muted">
        {[ages && `Ages ${ages}`, t.sex && t.sex !== "ALL" ? t.sex : "", `${t.criteria_count} parsed rules`, `shortlisted ${t.shortlisted_count}×`]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </li>
  );
}
