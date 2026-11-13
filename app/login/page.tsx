import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in · Progenitor" };

// Placeholder. JWT sign-in against /api/auth/token arrives in Phase 7b.
export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="font-display text-3xl">Sign in</h1>
      <form className="flex flex-col gap-4" aria-describedby="login-note">
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input name="username" autoComplete="username" disabled className="rounded border border-border bg-transparent px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input name="password" type="password" autoComplete="current-password" disabled className="rounded border border-border bg-transparent px-3 py-2" />
        </label>
        <button type="submit" disabled className="rounded bg-foreground px-3 py-2 text-background opacity-50">
          Sign in
        </button>
      </form>
      <p id="login-note" className="text-sm text-muted">
        Sign-in is not wired yet. It arrives with the app frontend (Phase 7b).
      </p>
    </main>
  );
}
