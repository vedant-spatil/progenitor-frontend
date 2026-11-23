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
  const reader = can("coordinator") || can("clinician");
  const links = [
    { href: "/app", label: "Home", show: true },
    { href: "/app/runs", label: "Runs", show: reader },
    { href: "/app/runs/new", label: "New run", show: can("coordinator") },
    { href: "/app/patients", label: "Patients", show: reader },
    { href: "/app/trials", label: "Trials", show: reader },
    { href: "/app/referrals", label: "Referrals", show: reader },
    { href: "/app/evals", label: "Evals", show: reader },
    { href: "/app/audit", label: "Audit", show: can("admin") },
  ].filter((l) => l.show);
  // The deepest matching link is the current section (/app/runs/new beats /app/runs; /app matches only itself).
  const current = links
    .filter((l) => path === l.href || (l.href !== "/app" && path.startsWith(`${l.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg-nav/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:h-14 lg:flex-nowrap">
          <Link href="/app" aria-label="Progenitor app home" className="py-3 text-xl lg:py-0">
            <Wordmark />
          </Link>
          <nav
            aria-label="App"
            className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto border-t border-line px-4 py-1.5 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:order-none lg:mx-0 lg:w-auto lg:border-0 lg:p-0"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current === l.href ? "page" : undefined}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted hover:text-fg aria-[current=page]:bg-card-raised aria-[current=page]:text-fg"
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
