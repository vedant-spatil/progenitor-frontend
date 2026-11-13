"use client";

import { Fragment, useEffect, useState } from "react";

type Health = { status: string; checks: Record<string, boolean> };
type State = { kind: "loading" } | { kind: "ok"; health: Health } | { kind: "error"; message: string };

export function BackendHealth() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const health = (await res.json()) as Health;
        setState({ kind: "ok", health });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: err instanceof Error ? err.message : "unreachable" });
      });
    return () => controller.abort();
  }, []);

  if (state.kind === "loading") {
    return (
      <>
        <dt>backend</dt>
        <dd data-testid="backend-status">checking…</dd>
      </>
    );
  }
  if (state.kind === "error") {
    return (
      <>
        <dt>backend</dt>
        <dd data-testid="backend-status">unreachable ({state.message})</dd>
      </>
    );
  }
  return (
    <>
      <dt>backend</dt>
      <dd data-testid="backend-status">{state.health.status}</dd>
      {Object.entries(state.health.checks).map(([name, ok]) => (
        <Fragment key={name}>
          <dt className="pl-4 text-muted">{name}</dt>
          <dd>{ok ? "ok" : "down"}</dd>
        </Fragment>
      ))}
    </>
  );
}
