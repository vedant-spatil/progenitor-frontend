import type { Metadata } from "next";
import { BackendHealth } from "@/components/backend-health";

export const metadata: Metadata = { title: "Health · Progenitor" };

export default function HealthPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="font-display text-3xl">Progenitor health</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-mono text-sm">
        <dt>frontend</dt>
        <dd data-testid="frontend-status">ok</dd>
        <BackendHealth />
      </dl>
    </main>
  );
}
