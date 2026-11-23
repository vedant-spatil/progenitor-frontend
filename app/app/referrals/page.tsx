"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/app/auth";
import { buttonSecondary, Card, ChipGroup, ErrorNote, formatTime, PageHeader } from "@/components/app/bits";
import { ReferralEditor } from "@/components/app/ReferralEditor";
import { usePagedApi } from "@/components/app/useApi";
import { ReferralInbox, ReferralStatus } from "@/lib/api/schemas";

const LABEL: Record<ReferralStatus, string> = { draft: "Draft", edited: "Edited", discarded: "Discarded" };

/** Referral drafts across runs. Clinicians edit here with the run view's editor; drafts are never sent anywhere. */
export default function ReferralsPage() {
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const parsed = ReferralStatus.safeParse(params.get("status"));
  const status = parsed.success ? parsed.data : "draft";

  const { first, items, next, error, loadMore } = usePagedApi(`/api/referrals?status=${status}`, ReferralInbox);
  const counts = first?.counts ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Referrals" />
      <p className="text-sm text-muted">
        Drafts written after clinician approval. {can("clinician") ? "Edit or discard them here." : "Clinicians edit them."} Nothing is sent
        from this app.
      </p>
      <ChipGroup
        label="Referral status"
        value={status}
        options={ReferralStatus.options.map((s) => ({ value: s, label: `${LABEL[s]}${counts ? ` (${counts[s]})` : ""}` }))}
        onChange={(v) => router.replace(`${pathname}?status=${v}`)}
      />
      {error && <ErrorNote>Could not load referrals.</ErrorNote>}
      <Card title={`${LABEL[status]} referrals`}>
        {items === null && !error ? (
          <p className="text-muted">Loading…</p>
        ) : items && items.length ? (
          <div className="flex flex-col gap-6">
            {items.map((r) => (
              <div key={r.id} className="flex flex-col gap-2">
                <p className="flex flex-wrap gap-x-3 text-sm">
                  <Link href={`/app/runs/${r.run_id}`} className="font-semibold hover:text-accent">
                    {r.patient_label || "Patient"}
                  </Link>
                  <Link href={`/app/trials/${r.nct_id}`} className="text-muted underline">
                    {r.title || r.nct_id}
                  </Link>
                  <span className="text-muted">
                    updated {formatTime(r.updated_at)}
                    {r.edited_by ? ` by ${r.edited_by}` : ""}
                  </span>
                </p>
                <ReferralEditor referral={r} canEdit={can("clinician")} />
              </div>
            ))}
            {next && (
              <div>
                <button type="button" onClick={loadMore} className={buttonSecondary}>
                  Load more
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted">No {LABEL[status].toLowerCase()} referrals.</p>
        )}
      </Card>
    </div>
  );
}
