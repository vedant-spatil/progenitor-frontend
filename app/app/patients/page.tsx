"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/app/auth";
import { Card, ChipGroup, formatTime, inputClass, LoadState, PageHeader, StatusBadge, Table, td } from "@/components/app/bits";
import { useApi } from "@/components/app/useApi";
import { PatientList } from "@/lib/api/schemas";

export default function PatientsPage() {
  const { can } = useAuth();
  const { data, error, loading } = useApi("/api/patients", PatientList);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");

  const sources = [...new Set(data?.items.map((p) => p.source) ?? [])].sort();
  const needle = q.trim().toLowerCase();
  const rows = (data?.items ?? []).filter(
    (p) => (!source || p.source === source) && (!needle || (p.label || `Patient ${p.id}`).toLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Patients" />
      <p className="text-sm text-muted">Synthetic and de-identified test records only. Labels are not names.</p>
      <div className="flex flex-col gap-3">
        <ChipGroup
          label="Record source"
          value={source}
          options={[{ value: "", label: "All sources" }, ...sources.map((s) => ({ value: s, label: s }))]}
          onChange={setSource}
        />
        <div className="max-w-sm">
          <label htmlFor="patient-search" className="sr-only">
            Filter by label
          </label>
          <input
            id="patient-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by label"
            className={inputClass}
          />
        </div>
      </div>
      <Card title={data ? `${rows.length} of ${data.items.length} patients` : "Patients"}>
        <LoadState loading={loading} error={error} empty={data && !rows.length ? "No patients match." : undefined} />
        {rows.length > 0 && (
          <Table caption="Patients" head={["Patient", "Source", "Profile cached", "Runs", "Last run", ""]}>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <Link href={`/app/patients/${p.id}`} className="font-semibold hover:text-accent">
                    {p.label || `Patient ${p.id}`}
                  </Link>
                </td>
                <td className={`${td} text-muted`}>{p.source}</td>
                <td className={`${td} text-muted`}>{p.profile_cached_at ? formatTime(p.profile_cached_at) : "Not yet"}</td>
                <td className={`${td} tabular-nums`}>{p.run_count}</td>
                <td className={td}>{p.last_run_status ? <StatusBadge status={p.last_run_status} /> : <span className="text-muted">None</span>}</td>
                <td className={`${td} text-right`}>
                  {can("coordinator") && (
                    <Link href={`/app/runs/new?patient=${p.id}`} className="text-accent underline whitespace-nowrap">
                      New run<span className="sr-only"> for {p.label || `patient ${p.id}`}</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
