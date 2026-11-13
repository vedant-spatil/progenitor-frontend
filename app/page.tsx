import Link from "next/link";

// Placeholder. The landing page arrives in Phase 7a (docs/LANDING.md).
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="font-display text-4xl">Progenitor</h1>
      <p className="text-muted">Agentic clinical trial matcher. Synthetic data only. Not for clinical use.</p>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/login">Sign in</Link>
        <Link href="/health">System health</Link>
      </nav>
    </main>
  );
}
