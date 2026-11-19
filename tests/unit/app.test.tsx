import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CriterionTable } from "@/components/app/CriterionTable";
import { safeNext } from "@/components/app/LoginForm";
import { ReviewPanel } from "@/components/app/ReviewPanel";
import { api, ApiError, errorDetail, login, tokens } from "@/lib/api/client";
import { Me, type ShortlistItem } from "@/lib/api/schemas";
import { isFinal, parseSse } from "@/lib/api/sse";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("SSE parser", () => {
  it("splits events across chunks and skips comments", () => {
    const a = parseSse('event: snapshot\ndata: {"status":"running","steps_used":0');
    expect(a.events).toEqual([]);
    const b = parseSse(a.rest + ',"pending_question":"","last_step":null}\n\n: ping\n\nevent: decision\ndata: {"step":1}\n\nevent: st');
    expect(b.events).toEqual([
      { event: "snapshot", data: { status: "running", steps_used: 0, pending_question: "", last_step: null } },
      { event: "decision", data: { step: 1 } },
    ]);
    expect(b.rest).toBe("event: st");
  });

  it("handles CRLF and multi-line data", () => {
    const { events } = parseSse('event: status\r\ndata: {"status":\r\ndata: "completed"}\r\n\r\n');
    expect(events).toEqual([{ event: "status", data: { status: "completed" } }]);
  });

  it("knows when the stream is over", () => {
    expect(isFinal({ event: "status", data: { status: "awaiting_review" } })).toBe(true);
    expect(isFinal({ event: "snapshot", data: { status: "completed" } })).toBe(true);
    expect(isFinal({ event: "status", data: { status: "running" } })).toBe(false);
    expect(isFinal({ event: "decision", data: { status: "completed" } })).toBe(false);
  });
});

describe("API client", () => {
  it("stores tokens on sign-in and sends the access token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { access: "A1", refresh: "R1" }))
      .mockResolvedValueOnce(json(200, { id: 1, username: "u", roles: ["clinician"] }));
    vi.stubGlobal("fetch", fetchMock);
    await login("u", "pw");
    expect(tokens.access()).toBe("A1");
    await api("/api/me", Me);
    const headers = fetchMock.mock.calls[1][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer A1");
  });

  it("refreshes once on 401 and retries", async () => {
    tokens.set("old", "R1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { detail: "expired" }))
      .mockResolvedValueOnce(json(200, { access: "new" }))
      .mockResolvedValueOnce(json(200, { id: 1, username: "u", roles: [] }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await api("/api/me", Me)).username).toBe("u");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/token/refresh");
    expect(tokens.access()).toBe("new");
  });

  it("clears tokens when the refresh fails", async () => {
    tokens.set("old", "R1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, { detail: "bad" })),
    );
    await expect(api("/api/me", Me)).rejects.toMatchObject({ status: 401 });
    expect(tokens.access()).toBeNull();
  });

  it("turns DRF errors into readable text", async () => {
    expect(errorDetail({ detail: "nope" })).toBe("nope");
    expect(errorDetail({ items: ["each trial may appear once"] })).toBe("items: each trial may appear once");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(409, { detail: "run is not waiting" })));
    const err = await api("/api/x", Me).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).detail).toBe("run is not waiting");
  });

  it("only redirects inside the app after sign-in", () => {
    expect(safeNext("/app/runs/1")).toBe("/app/runs/1");
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("//evil.example")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});

const item = (nct: string): ShortlistItem => ({
  nct_id: nct,
  title: `Trial ${nct}`,
  rank: 1,
  explanation: "fits",
  counts: { met: 1, unknown: 1 },
  status: "draft",
  verdicts: [
    { criterion_index: 0, kind: "inclusion", criterion_text: "HbA1c 7-10%", status: "met", evidence_refs: ["Observation/o1"], reason: "" },
    { criterion_index: 1, kind: "exclusion", criterion_text: "Recent MI", status: "unknown", evidence_refs: ["PMID:12345"], reason: "" },
  ],
});

describe("CriterionTable", () => {
  it("shows each verdict and links PubMed citations", () => {
    render(<CriterionTable verdicts={item("NCT1").verdicts} caption="rules" />);
    expect(screen.getByText("Met")).toBeTruthy();
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.getByText("Observation/o1").tagName).toBe("SPAN");
    expect(screen.getByRole("link", { name: "PMID:12345" }).getAttribute("href")).toBe("https://pubmed.ncbi.nlm.nih.gov/12345/");
  });
});

describe("ReviewPanel", () => {
  it("requires a decision for every trial, then posts the review", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(202, { id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", status: "queued" }));
    vi.stubGlobal("fetch", fetchMock);
    const onReviewed = vi.fn();
    render(<ReviewPanel runId="r1" items={[item("NCT1"), item("NCT2")]} canReview reviewable onReviewed={onReviewed} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(screen.getByRole("alert").textContent).toContain("NCT1, NCT2");

    fireEvent.click(screen.getAllByLabelText("Approve with note")[0]);
    fireEvent.change(screen.getByLabelText("Note for the referral draft"), { target: { value: "mention eGFR" } });
    fireEvent.click(screen.getAllByLabelText("Reject")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));

    await waitFor(() => expect(onReviewed).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/runs/r1/review");
    expect(JSON.parse(init.body)).toEqual({
      items: [
        { nct_id: "NCT1", decision: "edit", edits: { note: "mention eGFR" } },
        { nct_id: "NCT2", decision: "reject" },
      ],
    });
  });

  it("is read-only for coordinators", () => {
    render(<ReviewPanel runId="r1" items={[item("NCT1")]} canReview={false} reviewable onReviewed={() => {}} />);
    expect(screen.queryByRole("button", { name: "Submit review" })).toBeNull();
    expect(screen.getByText(/A clinician reviews this shortlist/)).toBeTruthy();
  });
});
