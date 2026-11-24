"use client";

import Link from "next/link";
import { useAuth } from "@/components/app/auth";
import { buttonPrimary, Card, Counts, formatTime, LoadState, PageHeader, StatusBadge, Table, td } from "@/components/app/bits";
import { useApi } from "@/components/app/useApi";
import { usePathId } from "@/components/app/usePathId";
import { PatientDetail, type PatientProfile } from "@/lib/api/schemas";

export default function PatientPage() {
  const id = usePathId("/app/patients/");
  const { can } = useAuth();
  const { data, error, loading } = useApi(id === null ? null : `/api/patients/${encodeURIComponent(id)}`, PatientDetail);

  if (!data) return <LoadState loading={loading || id === null} error={error} />;
  const name = data.label || `Patient ${data.id}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={name}>
        {can("coordinator") && (
          <Link href={`/app/runs/new?patient=${data.id}`} className={buttonPrimary}>
            New run
          </Link>
        )}
      </PageHeader>
      <p className="text-sm text-muted">
        <span className="rounded-full bg-card-raised px-2 py-0.5 text-xs">Synthetic</span> Source {data.source}
        {data.profile_cached_at ? ` · profile cached ${formatTime(data.profile_cached_at)}` : ""}
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Profile">
          {data.profile ? (
            <ProfileView profile={data.profile} />
          ) : (
            <p className="text-muted">No cached profile yet. The Profiler builds one during the first run.</p>
          )}
        </Card>
        <div className="flex flex-col gap-6">
          <Card title="Runs">
            {data.runs.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {data.runs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/runs/${r.id}`} className="flex flex-wrap items-center gap-3 py-2.5 hover:text-accent">
                      <StatusBadge status={r.status} />
                      <span className="ml-auto text-sm text-muted">{formatTime(r.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No runs yet.</p>
            )}
          </Card>
          <Card title="Shortlisted trials">
            {data.shortlisted.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {data.shortlisted.map((s) => (
                  <li key={`${s.run_id}-${s.nct_id}`} className="flex flex-col gap-0.5 py-2.5 text-sm">
                    <span className="flex flex-wrap items-center gap-x-3">
                      <Link href={`/app/trials/${s.nct_id}`} className="font-mono text-accent underline">
                        {s.nct_id}
                      </Link>
                      <span className="text-muted">#{s.rank}</span>
                      <span className="rounded-full bg-card-raised px-2 py-0.5 text-xs">{s.status}</span>
                    </span>
                    <span className="text-fg/90">{s.title}</span>
                    <Counts counts={s.counts} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No trials shortlisted yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Ref({ id }: { id: string }) {
  return <span className="font-mono text-xs text-muted [overflow-wrap:anywhere]">{id}</span>;
}

function ProfileView({ profile }: { profile: PatientProfile }) {
  return (
    <div className="flex flex-col gap-5">
      <p>
        {profile.age_years !== null ? `${profile.age_years} years` : "Age unknown"}
        {profile.sex ? ` · ${profile.sex}` : ""} <Ref id={profile.patient_ref} />
      </p>
      {profile.truncated && <p className="text-sm text-muted">Some resource types hit the page limit; the list is partial.</p>}
      <section aria-label="Conditions">
        <h3 className="mb-2 font-semibold">Conditions ({profile.conditions.length})</h3>
        {profile.conditions.length ? (
          <Table caption="Conditions" head={["Condition", "Status", "Onset", "Evidence"]}>
            {profile.conditions.map((c) => (
              <tr key={c.resource_id}>
                <td className={td}>{c.display || c.code}</td>
                <td className={`${td} text-muted`}>{c.clinical_status}</td>
                <td className={`${td} text-muted`}>{c.onset ?? ""}</td>
                <td className={td}>
                  <Ref id={c.resource_id} />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted">None recorded.</p>
        )}
      </section>
      <section aria-label="Medications">
        <h3 className="mb-2 font-semibold">Medications ({profile.medications.length})</h3>
        {profile.medications.length ? (
          <Table caption="Medications" head={["Medication", "Status", "Ordered", "Evidence"]}>
            {profile.medications.map((m) => (
              <tr key={m.resource_id}>
                <td className={td}>{m.display || m.code}</td>
                <td className={`${td} text-muted`}>{m.status}</td>
                <td className={`${td} text-muted`}>{m.authored_on ?? ""}</td>
                <td className={td}>
                  <Ref id={m.resource_id} />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted">None recorded.</p>
        )}
      </section>
      <section aria-label="Labs">
        <h3 className="mb-2 font-semibold">Latest labs ({profile.labs.length})</h3>
        {profile.labs.length ? (
          <Table caption="Latest labs" head={["Lab", "Value", "Date", "Evidence"]}>
            {profile.labs.map((l) => (
              <tr key={l.resource_id}>
                <td className={td}>{l.display || l.code}</td>
                <td className={`${td} tabular-nums`}>
                  {l.value !== null ? `${l.value} ${l.unit}` : l.value_text}
                </td>
                <td className={`${td} text-muted`}>{l.effective ?? ""}</td>
                <td className={td}>
                  <Ref id={l.resource_id} />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted">None recorded.</p>
        )}
      </section>
      {profile.notes.length > 0 && (
        <section aria-label="Notes">
          <h3 className="mb-2 font-semibold">Notes ({profile.notes.length})</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {profile.notes.map((n) => (
              <li key={n.resource_id}>
                {n.text} <Ref id={n.resource_id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
