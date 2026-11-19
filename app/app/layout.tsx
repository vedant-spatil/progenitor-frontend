import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/auth";

export const metadata: Metadata = {
  title: "Progenitor app",
  robots: { index: false, follow: false },
};

// The app is client-rendered behind sign-in: the static shell is just the loading line, and the
// URL-dependent parts (path, run id) stream in under Suspense.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-xl px-4 py-16 text-center text-muted">Loading…</p>}>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </Suspense>
  );
}
