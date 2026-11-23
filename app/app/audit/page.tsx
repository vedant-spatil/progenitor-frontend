"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/app/auth";
import { buttonSecondary, Card, ErrorNote, formatTime, inputClass, PageHeader, Table, td } from "@/components/app/bits";
import { usePagedApi } from "@/components/app/useApi";
import { AuditLog } from "@/lib/api/schemas";

/** Admin only. Event metadata (time, kind, actor, node, run). The API never returns payloads. */
export default function AuditPage() {
  const { can } = useAuth();
  const [kind, setKind] = useState("");
  const [actor, setActor] = useState("");
  const [actorInput, setActorInput] = useState("");
  const isAdmin = can("admin");
  const base = new URLSearchParams();
  if (kind) base.set("kind", kind);
  if (actor) base.set("actor", actor);
  const qs = base.toString();
  const { first, items: rows, next, error, loadMore } = usePagedApi(isAdmin ? `/api/audit${qs ? `?${qs}` : ""}` : null, AuditLog);
  // While a new filter loads, keep the chosen kind as an option so the select does not jump.
  const kinds = first?.kinds ?? (kind ? [{ value: kind, label: kind }] : []);

  function submit(e: FormEvent) {
    e.preventDefault();
    setActor(actorInput.trim());
  }

  if (!isAdmin) return <ErrorNote>Only admins can read the audit log.</ErrorNote>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit log" />
      <p className="text-sm text-muted">Append-only. Shows who did what and when; event details stay out of this view.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Event kind
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="">All kinds</option>
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={submit} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Actor username
            <input value={actorInput} onChange={(e) => setActorInput(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" className={buttonSecondary}>
            Filter
          </button>
        </form>
      </div>
      {error && <ErrorNote>Could not load the audit log.</ErrorNote>}
      <Card title="Events">
        {rows === null && !error ? (
          <p className="text-muted">Loading…</p>
        ) : rows && rows.length ? (
          <>
            <Table caption="Audit events" head={["Time", "Event", "Actor", "Node", "Run"]}>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatTime(e.created_at)}</td>
                  <td className={td}>{e.kind_label}</td>
                  <td className={td}>{e.actor ?? <span className="text-muted">system</span>}</td>
                  <td className={`${td} font-mono text-xs`}>{e.node}</td>
                  <td className={`${td} font-mono text-xs`}>
                    {e.run_id ? (
                      can("coordinator") || can("clinician") ? (
                        <Link href={`/app/runs/${e.run_id}`} className="text-accent underline">
                          {e.run_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span title={e.run_id}>{e.run_id.slice(0, 8)}</span>
                      )
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            {next && (
              <div className="pt-4">
                <button type="button" onClick={loadMore} className={buttonSecondary}>
                  Load more
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted">No events match.</p>
        )}
      </Card>
    </div>
  );
}
