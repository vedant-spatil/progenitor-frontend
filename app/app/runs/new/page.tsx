"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/app/auth";
import { buttonPrimary, Card, ErrorNote, inputClass } from "@/components/app/bits";
import { api, ApiError } from "@/lib/api/client";
import { PatientList, RunAccepted, RunCreateRequest, type Patient } from "@/lib/api/schemas";

export default function NewRunPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [patientId, setPatientId] = useState("");
  const [asOf, setAsOf] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/patients", PatientList)
      .then((p) => setPatients(p.items))
      .catch(() => setError("Could not load patients."));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const req = RunCreateRequest.safeParse({ patient_id: Number(patientId), ...(asOf ? { as_of: asOf } : {}) });
    if (!patientId || !req.success) {
      setError("Choose a patient.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const run = await api("/api/runs", RunAccepted, { method: "POST", body: req.data });
      router.push(`/app/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || `Could not start (HTTP ${err.status})` : "Could not start");
      setBusy(false);
    }
  }

  if (!can("coordinator")) {
    return <ErrorNote>Only coordinators can start a match.</ErrorNote>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Match a patient</h1>
      <Card title="New run">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Synthetic patient</span>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass} required>
              <option value="">{patients === null ? "Loading…" : "Choose a patient"}</option>
              {patients?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || `Patient ${p.id}`} ({p.source})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Evaluate the record as of (optional; default today)</span>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputClass} />
          </label>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div>
            <button type="submit" disabled={busy} className={buttonPrimary}>
              {busy ? "Starting…" : "Start match"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
