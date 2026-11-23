// Phase 7c unit tests: Zod mirrors of the new endpoints, the eval chart, nav by role, shared bits.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Counts } from "@/components/app/bits";
import { EvalChart } from "@/components/app/EvalChart";
import { AuditLog, EvalReports, Overview, PatientDetail, PatientList, ReferralInbox, RunList, TrialList } from "@/lib/api/schemas";

const T = "2026-11-20T10:00:00Z";
const RUN = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

let roles: string[] = [];
let path = "/app";
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("@/components/app/auth", () => ({
  useAuth: () => ({ me: { id: 1, username: "u", roles }, signOut: () => {}, can: (r: string) => roles.includes(r) }),
}));

describe("7c schemas", () => {
  it("parse the backend shapes", () => {
    expect(PatientList.parse({ items: [{ id: 1, label: "S", source: "synthea", profile_cached_at: null, run_count: 0, last_run_status: null }] }).items).toHaveLength(1);
    expect(RunList.parse({ items: [], next: T }).next).toBe(T);
    const counts = { queued: 0, running: 0, waiting_clinician: 1, awaiting_review: 0, completed: 0, failed: 0, cancelled: 0 };
    const ov = Overview.parse({ counts, queue: [{ run_id: RUN, patient_label: "S", status: "waiting_clinician", reason: "answer_question", since: T }], recent: [] });
    expect(ov.queue[0].reason).toBe("answer_question");
    expect(
      PatientDetail.parse({ id: 1, label: "S", source: "synthea", profile_cached_at: null, profile: null, runs: [], shortlisted: [] }).profile,
    ).toBeNull();
    expect(TrialList.parse({ items: [], total: 0, page: 1, page_size: 25, statuses: [] }).total).toBe(0);
    expect(ReferralInbox.parse({ counts: { draft: 0, edited: 0, discarded: 0 }, next: null, items: [] }).items).toEqual([]);
    expect(AuditLog.parse({ kinds: [], next: null, items: [{ id: 1, created_at: T, kind: "answer", kind_label: "A", actor: null, node: "", run_id: null }] }).items).toHaveLength(1);
    const ev = EvalReports.parse({
      thresholds: null,
      reports: [{ id: "20261120-0633", created_at: T, config: { model: "m", spent_usd: null }, table: { sigir: { bm25: { "ndcg@10": 0.7 } } }, fails: [] }],
    });
    expect(ev.reports[0].table.sigir.bm25["ndcg@10"]).toBe(0.7);
  });

  it("reject an unknown queue reason and a missing referral count", () => {
    const counts = { queued: 0, running: 0, waiting_clinician: 0, awaiting_review: 0, completed: 0, failed: 0, cancelled: 0 };
    expect(Overview.safeParse({ counts, queue: [{ run_id: RUN, patient_label: "", status: "failed", reason: "other", since: T }], recent: [] }).success).toBe(false);
    expect(ReferralInbox.safeParse({ counts: { draft: 0 }, next: null, items: [] }).success).toBe(false);
  });
});

describe("EvalChart", () => {
  const series = [
    { key: "bm25", label: "BM25", color: "red" },
    { key: "supervisor", label: "Supervisor", color: "blue" },
  ];
  const groups = [
    { key: "sigir", label: "SIGIR", values: { bm25: 0.72, supervisor: 0.86 } },
    { key: "all", label: "All", values: { bm25: 0.7, supervisor: null } },
  ];

  it("draws one labelled bar per value, skips missing values, has a legend", () => {
    render(<EvalChart title="NDCG@10 by cohort" series={series} groups={groups} />);
    expect(screen.getByRole("group", { name: /NDCG@10 by cohort/ })).toBeTruthy();
    expect(screen.getAllByLabelText(/^(SIGIR|All), /)).toHaveLength(3);
    expect(screen.getByText("0.86")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Legend" }).textContent).toContain("Supervisor");
  });

  it("shows the exact value on hover and focus", () => {
    render(<EvalChart title="t" series={series} groups={groups} />);
    const bar = screen.getByLabelText("SIGIR, Supervisor: 0.860");
    fireEvent.mouseEnter(bar);
    expect(screen.getByText("SIGIR · Supervisor: 0.860")).toBeTruthy();
    fireEvent.mouseLeave(bar);
    expect(screen.queryByText("SIGIR · Supervisor: 0.860")).toBeNull();
    fireEvent.focus(screen.getByLabelText("All, BM25: 0.700"));
    expect(screen.getByText("All · BM25: 0.700")).toBeTruthy();
  });
});

describe("AppShell nav", () => {
  async function navLinks() {
    const { AppShell } = await import("@/components/app/AppShell");
    render(<AppShell>body</AppShell>);
    const nav = screen.getByRole("navigation", { name: "App" });
    return Array.from(nav.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("aria-current")]);
  }

  it("shows run pages to coordinators and marks the deepest section", async () => {
    roles = ["coordinator"];
    path = "/app/runs/new";
    const links = await navLinks();
    expect(links.map((l) => l[0])).toEqual(["Home", "Runs", "New run", "Patients", "Trials", "Referrals", "Evals"]);
    expect(links.filter((l) => l[1] === "page").map((l) => l[0])).toEqual(["New run"]);
  });

  it("gives admins only Home and Audit", async () => {
    roles = ["admin"];
    path = "/app/audit";
    const links = await navLinks();
    expect(links.map((l) => l[0])).toEqual(["Home", "Audit"]);
    expect(links.find((l) => l[0] === "Audit")?.[1]).toBe("page");
  });

  it("marks a detail page's section", async () => {
    roles = ["clinician"];
    path = "/app/trials/NCT04000001";
    const links = await navLinks();
    expect(links.map((l) => l[0])).not.toContain("New run");
    expect(links.filter((l) => l[1] === "page").map((l) => l[0])).toEqual(["Trials"]);
  });
});

describe("Counts", () => {
  it("lists non-zero verdict counts in a fixed order", () => {
    const { container } = render(<Counts counts={{ unknown: 1, met: 2, not_met: 0 }} />);
    expect(container.textContent).toBe("2 met · 1 unknown");
  });
});
