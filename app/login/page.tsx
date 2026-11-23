import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/app/LoginForm";
import { Wordmark } from "@/components/landing/ui";

export const metadata: Metadata = { title: "Sign in · Progenitor", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-3xl">
        <Wordmark />
      </p>
      <h1 className="font-display text-3xl font-bold">Sign in</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted">Research demo. Synthetic data only. Not for clinical use.</p>
    </main>
  );
}
