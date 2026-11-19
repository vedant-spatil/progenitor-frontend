"use client";

import { CircleCheck, FileText, RefreshCw } from "lucide-react";
import { useState } from "react";
import { copy } from "@/content/landing/copy";
import { patients } from "@/content/landing/patients";
import { PatientPane } from "./PatientPane";
import { SegmentedControl } from "./SegmentedControl";
import { rowsDuration, ShortlistPane } from "./ShortlistPane";
import { Container, Plate, Wordmark } from "./ui";

const PANEL_ID = "preview-panel";

export function FloatingToast({ text, delayMs, run }: { text: string; delayMs: number; run: number }) {
  return (
    <div
      key={run}
      role="status"
      className="row-in absolute right-3 bottom-4 flex items-center gap-3 rounded-xl border border-line bg-card-raised px-4 py-3 text-sm font-bold text-fg shadow-2xl md:-right-4 md:bottom-10 md:px-6 md:py-4 md:text-xl"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <CircleCheck aria-hidden className="size-5 text-success md:size-6" />
      {text}
    </div>
  );
}

/** The interactive preview: segmented control plus mock app window. Static fixtures, no backend call. */
export function PreviewSection() {
  const p = copy.preview;
  const [id, setId] = useState(patients[0].id);
  const [run, setRun] = useState(0);
  const patient = patients.find((x) => x.id === id) ?? patients[0];

  return (
    <section id="how-it-works" aria-labelledby="preview-heading" className="py-12 md:py-16">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <h2 id="preview-heading" className="font-display text-3xl font-bold tracking-tight md:text-[2.6rem]">
            {p.heading}
          </h2>
          <SegmentedControl
            label={p.tabsLabel}
            options={patients.map((x) => ({ id: x.id, label: x.tab }))}
            value={id}
            onChange={(next) => {
              setId(next);
              setRun((r) => r + 1);
            }}
            panelId={PANEL_ID}
          />
        </div>

        <div className="relative mt-8">
          <div
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`tab-${patient.id}`}
            className="overflow-hidden rounded-3xl border border-line bg-bg-nav"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 md:px-6">
              <Wordmark className="text-xl md:text-2xl" />
              <span className="font-semibold">
                {patient.name}, {patient.age}
              </span>
              <span className="text-muted">{p.status}</span>
              <span className="ml-auto rounded-full bg-card-raised px-4 py-1.5 text-sm text-fg/90">{p.pill}</span>
            </div>
            <div key={patient.id} className="crossfade grid md:grid-cols-2">
              <div className="min-w-0 border-line bg-card md:border-r">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <span className="flex items-center gap-2 font-semibold">
                    <FileText aria-hidden className="size-4 text-muted" />
                    {p.fileName}
                  </span>
                  <span className="text-sm text-muted md:text-base">{p.stepOne}</span>
                </div>
                <PatientPane record={patient.record} />
              </div>
              <div className="min-w-0 border-t border-line md:border-t-0">
                <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
                  <button
                    type="button"
                    onClick={() => setRun((r) => r + 1)}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-1.5 font-bold text-accent-ink"
                  >
                    <RefreshCw aria-hidden className="size-4" />
                    {p.match}
                  </button>
                  <span className="text-sm text-muted md:text-base">{p.shortlistLabel}</span>
                </div>
                <div className="px-4 pt-6 pb-24 md:px-10 md:pt-8 md:pb-28">
                  <ShortlistPane
                    trials={patient.trials}
                    labels={p.statusLabels}
                    noEvidence={p.noEvidence}
                    run={run}
                  />
                </div>
              </div>
            </div>
          </div>
          <FloatingToast text={p.toast} delayMs={rowsDuration(patient.trials)} run={run} />
          <Plate />
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-base text-muted md:text-lg">
          {p.caption} <a href="#how-it-works" className="font-semibold text-accent">{p.captionAccent}</a>
        </p>
      </Container>
    </section>
  );
}
