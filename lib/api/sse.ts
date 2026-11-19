// Server-sent events for GET /api/runs/{id}/events. fetch-based (EventSource cannot send the
// Authorization header, and tokens never go in the URL). Reconnects with backoff until stopped,
// or until a status event says the run paused or ended.
import { authFetch } from "./client";
import { PAUSED_OR_DONE, RunStatus } from "./schemas";

export type SseEvent = { event: string; data: unknown };

/** Split a buffer into complete events; returns the unparsed remainder. Comments (": ping") are skipped. */
export function parseSse(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      const i = line.indexOf(":");
      const field = i === -1 ? line : line.slice(0, i);
      const value = i === -1 ? "" : line.slice(i + 1).replace(/^ /, "");
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }
    if (!data.length) continue;
    try {
      events.push({ event, data: JSON.parse(data.join("\n")) });
    } catch {
      // not JSON: ignore
    }
  }
  return { events, rest };
}

/** True when this event means the stream will close and should not be reopened. */
export function isFinal(e: SseEvent): boolean {
  if (e.event !== "status" && e.event !== "snapshot") return false;
  const status = RunStatus.safeParse((e.data as { status?: unknown } | null)?.status);
  return status.success && PAUSED_OR_DONE.has(status.data);
}

export type Subscription = { stop: () => void };

export function subscribeRun(
  runId: string,
  onEvent: (e: SseEvent) => void,
  opts: { onConnection?: (state: "open" | "retrying" | "closed") => void; maxDelayMs?: number } = {},
): Subscription {
  const controller = new AbortController();
  let stopped = false;
  let attempt = 0;

  const loop = async () => {
    while (!stopped) {
      let final = false;
      try {
        const resp = await authFetch(`/api/runs/${runId}/events`, {
          headers: { Accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
          opts.onConnection?.("closed");
          return; // retrying cannot help
        }
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        opts.onConnection?.("open");
        attempt = 0;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSse(buffer);
          buffer = parsed.rest;
          for (const e of parsed.events) {
            onEvent(e);
            if (isFinal(e)) final = true;
          }
        }
      } catch {
        if (stopped) return;
      }
      if (final || stopped) {
        opts.onConnection?.("closed");
        return;
      }
      opts.onConnection?.("retrying");
      const delay = Math.min(opts.maxDelayMs ?? 15_000, 1000 * 2 ** attempt++);
      await new Promise((r) => setTimeout(r, delay));
    }
  };
  void loop();

  return {
    stop() {
      stopped = true;
      controller.abort();
    },
  };
}
