"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, logout as clearTokens, tokens } from "@/lib/api/client";
import { Me, type Role } from "@/lib/api/schemas";

type AuthState = { me: Me; signOut: () => void; can: (role: Role) => boolean };

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthGate");
  return ctx;
}

export function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Loads the signed-in user; sends anyone without a valid session to /login. */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tokens.access() && !tokens.refresh()) {
      router.replace(loginUrl(pathname));
      return;
    }
    let live = true;
    api("/api/me", Me)
      .then((m) => live && setMe(m))
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) router.replace(loginUrl(pathname));
        else setError("Could not reach the server. Try again in a moment.");
      });
    return () => {
      live = false;
    };
  }, [router, pathname]);

  const signOut = useCallback(() => {
    clearTokens();
    router.replace("/login");
  }, [router]);

  if (error) {
    return (
      <p role="alert" className="mx-auto max-w-xl px-4 py-16 text-center text-muted">
        {error}
      </p>
    );
  }
  if (!me) {
    return (
      <p className="mx-auto max-w-xl px-4 py-16 text-center text-muted" aria-live="polite">
        Loading…
      </p>
    );
  }
  return (
    <AuthContext.Provider value={{ me, signOut, can: (role) => me.roles.includes(role) }}>{children}</AuthContext.Provider>
  );
}
