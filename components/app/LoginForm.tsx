"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, login } from "@/lib/api/client";
import { buttonPrimary, ErrorNote, inputClass } from "./bits";

/** Only same-app paths are allowed as the post-login destination (no open redirects). */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      router.replace(safeNext(params.get("next")));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Wrong username or password."
          : "Could not sign in. Try again in a moment.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Username
        <input
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" disabled={busy} className={buttonPrimary}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
