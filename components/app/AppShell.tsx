"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/landing/ThemeToggle";
import { Wordmark } from "@/components/landing/ui";
import { useAuth } from "./auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { me, signOut, can } = useAuth();
  const path = usePathname();
  const links = [
    { href: "/app", label: "Runs", show: true },
    { href: "/app/runs/new", label: "New run", show: can("coordinator") },
  ].filter((l) => l.show);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg-nav/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/app" aria-label="Progenitor app home" className="text-xl">
            <Wordmark />
          </Link>
          <nav aria-label="App" className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path === l.href ? "page" : undefined}
                className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg aria-[current=page]:bg-card-raised aria-[current=page]:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">
              {me.username} · {me.roles.join(", ") || "no role"}
            </span>
            <ThemeToggle label="Switch colour theme" />
            <button type="button" onClick={signOut} className="rounded-lg border border-line px-3 py-1.5 hover:border-fg/40">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-line py-4 text-center text-sm text-muted">
        Research demo. Synthetic data only. Not for clinical use.
      </footer>
    </>
  );
}
