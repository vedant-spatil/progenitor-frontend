// Typed client for the backend API. Same-origin only: every call goes through the /api/* rewrite.
// Tokens live in sessionStorage (one tab, cleared when it closes) and never go in URLs.
import type { z } from "zod";
import { TokenPair, TokenRefresh } from "./schemas";

const ACCESS = "progenitor.access";
const REFRESH = "progenitor.refresh";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
  }
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // storage blocked: the user has to sign in again on each load
  }
}

export const tokens = {
  access: (): string | null => store()?.getItem(ACCESS) ?? null,
  refresh: (): string | null => store()?.getItem(REFRESH) ?? null,
  set(access: string, refresh?: string) {
    store()?.setItem(ACCESS, access);
    if (refresh) store()?.setItem(REFRESH, refresh);
  },
  clear() {
    store()?.removeItem(ACCESS);
    store()?.removeItem(REFRESH);
  },
};

/** Best-effort message from a DRF error body ({"detail": ...} or {"field": ["msg"]}). */
export function errorDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  return Object.entries(b)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : String(v)}`)
    .join("; ");
}

async function readJson(resp: Response): Promise<unknown> {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<void> {
  const resp = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await readJson(resp);
  if (!resp.ok) throw new ApiError(resp.status, errorDetail(body) || "Sign-in failed");
  const pair = TokenPair.parse(body);
  tokens.set(pair.access, pair.refresh);
}

export function logout(): void {
  tokens.clear();
}

let refreshing: Promise<boolean> | null = null;

/** Swap the refresh token for a new access token. Concurrent callers share one request. */
export function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh();
  if (!refresh) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const resp = await fetch("/api/auth/token/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!resp.ok) {
        tokens.clear();
        return false;
      }
      tokens.set(TokenRefresh.parse(await readJson(resp)).access);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Fetch with the access token; on 401 refresh once and retry. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    const access = tokens.access();
    if (access) headers.set("Authorization", `Bearer ${access}`);
    return fetch(path, { ...init, headers });
  };
  let resp = await send();
  if (resp.status === 401 && (await refreshAccess())) resp = await send();
  return resp;
}

/** JSON request validated against a Zod schema. Throws ApiError on HTTP errors. */
export async function api<S extends z.ZodType>(
  path: string,
  schema: S,
  init: { method?: string; body?: unknown } = {},
): Promise<z.infer<S>> {
  const resp = await authFetch(path, {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = await readJson(resp);
  if (!resp.ok) throw new ApiError(resp.status, errorDetail(body));
  return schema.parse(body);
}
