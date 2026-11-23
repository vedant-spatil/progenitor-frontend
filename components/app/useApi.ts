"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";
import { api, ApiError } from "@/lib/api/client";

/** GET a path and validate it. `path` null skips the request. Reloads when the path changes. */
export function useApi<S extends z.ZodType>(path: string | null, schema: S) {
  const [data, setData] = useState<z.infer<S> | null>(null);
  const [error, setError] = useState("");
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    if (path === null) return;
    let live = true;
    api(path, schema)
      .then((d) => {
        if (!live) return;
        setData(d);
        setError("");
        setLoadedPath(path);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setError(
          e instanceof ApiError
            ? e.status === 404
              ? "Not found."
              : e.status === 403
                ? "Your role cannot see this page."
                : `Could not load (HTTP ${e.status}).`
            : "Could not load. Check the connection.",
        );
        setLoadedPath(path);
      });
    return () => {
      live = false;
    };
  }, [path, schema]);

  return { data, error, loading: path !== null && loadedPath !== path, setData };
}

type Page = { items: unknown[]; next: string | null };

/**
 * Cursor-paged GET (?before=<cursor>). Pages for an old path are dropped, so changing filters never mixes lists.
 * `first` is the whole first-page body (for extra fields such as counts).
 */
export function usePagedApi<T extends Page>(path: string | null, schema: z.ZodType<T>) {
  const [state, setState] = useState<{ path: string; first: T; items: T["items"]; next: string | null } | null>(
    null,
  );
  const [failure, setFailure] = useState<{ path: string; message: string } | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (path === null) return;
    let live = true;
    api(path, schema)
      .then((d) => live && setState({ path, first: d, items: d.items, next: d.next }))
      .catch(() => live && setFailure({ path, message: "Could not load. Check the connection." }));
    return () => {
      live = false;
    };
  }, [path, schema]);

  const current = state && state.path === path ? state : null;
  const error = failure && failure.path === path ? failure.message : "";

  async function loadMore() {
    if (!current?.next || path === null) return;
    setMore(true);
    try {
      const d = await api(`${path}${path.includes("?") ? "&" : "?"}before=${encodeURIComponent(current.next)}`, schema);
      setState((s) => (s && s.path === path ? { ...s, items: [...s.items, ...d.items], next: d.next } : s));
    } catch {
      setFailure({ path, message: "Could not load more." });
    } finally {
      setMore(false);
    }
  }

  return {
    first: current?.first ?? null,
    items: current?.items ?? null,
    next: current?.next ?? null,
    error,
    loading: path !== null && !current && !error,
    more,
    loadMore,
  };
}
