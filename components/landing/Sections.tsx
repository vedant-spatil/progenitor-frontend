import { Check, CircleCheck, Cloud, FileText, History, MessageCircle } from "lucide-react";
import { copy } from "@/content/landing/copy";
import { Reveal } from "./Reveal";
import {
  ButtonLink,
  CheckItem,
  Container,
  Eyebrow,
  ICONS,
  IconTile,
  Plate,
  SectionHeading,
  TextLink,
  Wordmark,
} from "./ui";

export function LogoStrip() {
  const { label, items } = copy.standards;
  return (
    <section aria-label={label} className="py-14 md:py-20">
      <Container className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-14">
        <p className="text-base font-semibold tracking-[0.06em] text-muted uppercase">{label}</p>
        <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-lg font-bold md:text-xl">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <li className="rounded-3xl border border-line bg-card p-8 md:p-11">
      <IconTile icon={ICONS[icon]} />
      <h3 className="mt-7 text-2xl font-bold md:text-[1.6rem]">{title}</h3>
      <p className="mt-4 text-lg leading-relaxed text-muted md:text-xl">{body}</p>
    </li>
  );
}

export function FeatureGrid() {
  const a = copy.agents;
  return (
    <section id="features" aria-labelledby="features-heading" className="py-24 md:py-40">
      <Container>
        <Reveal>
          <Eyebrow>{a.eyebrow}</Eyebrow>
          <SectionHeading id="features-heading" lines={a.heading} className="mt-6" />
          <p className="mt-6 text-lg text-muted md:text-[1.4rem]">{a.subtitle}</p>
        </Reveal>
        <Reveal>
          <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {a.cards.map((c) => (
              <FeatureCard key={c.title} {...c} />
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}

const AVATAR_COLOURS = ["bg-[#8ec9f0]", "bg-[#c9a0e8]", "bg-[#f28db2]"];

export function ReviewMock() {
  const m = copy.clinicians.mock;
  return (
    <figure className="flex flex-col items-center gap-5">
      <div className="w-full rounded-3xl border border-line bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 md:px-6">
          <FileText aria-hidden className="size-4 text-muted" />
          <span className="font-mono text-sm font-semibold md:text-base">{m.file}</span>
          <span className="ml-auto flex items-center gap-2 text-sm text-success md:text-base">
            <Check aria-hidden className="size-4" />
            {m.status}
          </span>
          <span className="flex -space-x-2" aria-hidden>
            {m.avatars.map((a, i) => (
              <span
                key={a}
                className={`inline-flex size-8 items-center justify-center rounded-full border-2 border-card text-xs font-bold text-[#2a1d16] ${AVATAR_COLOURS[i]}`}
              >
                {a}
              </span>
            ))}
          </span>
        </div>
        <div className="px-6 pt-10 pb-8 md:px-11">
          <p className="font-display text-2xl leading-tight font-bold md:text-[2.2rem]">{m.heading}</p>
          <p className="mt-9 text-lg leading-loose text-muted md:text-xl">
            {m.textBefore}
            <span className="relative rounded bg-highlight px-1 text-fg">
              {m.highlight}
              <span className="absolute -top-6 left-0 rounded bg-[#c9a0e8] px-1.5 text-xs font-bold text-[#2a1d16]">
                {m.tag}
              </span>
            </span>
          </p>
          <div className="mt-8 ml-auto max-w-md rounded-2xl bg-card-raised p-5 shadow-xl">
            <div className="flex gap-3">
              <span
                aria-hidden
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f28db2] text-xs font-bold text-[#2a1d16]"
              >
                R
              </span>
              <div>
                <p>
                  <span className="font-bold">{m.commentAuthor}</span>
                  <span className="text-muted"> · {m.commentRole}</span>
                </p>
                <p className="mt-1">{m.comment}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                  <MessageCircle aria-hidden className="size-3.5" />
                  {m.reply}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-muted">{copy.clinicians.caption}</figcaption>
    </figure>
  );
}

export function ClinicianSection() {
  const c = copy.clinicians;
  return (
    <section id="clinicians" aria-labelledby="clinicians-heading" className="py-16 md:py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <SectionHeading id="clinicians-heading" lines={c.heading} className="mt-6" />
          <p className="mt-7 text-lg leading-relaxed text-muted md:text-[1.4rem]">{c.body}</p>
          <p className="mt-8">
            <TextLink href={c.link.href}>{c.link.label}</TextLink>
          </p>
          <p className="mt-6 text-muted">{c.note}</p>
        </Reveal>
        <Reveal>
          <ReviewMock />
        </Reveal>
      </Container>
    </section>
  );
}

export function LedgerStrip() {
  const l = copy.ledger;
  return (
    <section aria-labelledby="ledger-heading" className="py-10 md:py-14">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-8 rounded-3xl border border-line bg-card p-7 md:p-11 lg:flex-row lg:items-center">
            <IconTile icon={History} className="shrink-0" />
            <div className="flex-1">
              <h2 id="ledger-heading" className="text-2xl font-bold md:text-[1.75rem]">
                {l.title}
              </h2>
              <p className="mt-3 text-lg text-muted md:text-xl">{l.body}</p>
            </div>
            <ol className="flex flex-wrap items-center gap-y-2" aria-label="Example run timeline">
              {l.steps.map((s, i) => {
                const last = i === l.steps.length - 1;
                return (
                  <li key={s} className="flex items-center">
                    {i > 0 && <span aria-hidden className="h-px w-4 bg-line" />}
                    <span
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 ${
                        last ? "bg-accent-soft font-bold text-accent" : "bg-card-raised text-muted"
                      }`}
                    >
                      {s}
                      {last && <Check aria-hidden className="size-4" />}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function ListPanel() {
  const r = copy.referral;
  return (
    <section aria-labelledby="referral-heading" className="py-16 md:py-28">
      <Container>
        <Reveal>
          <div className="grid gap-14 rounded-[32px] bg-panel [&>*]:min-w-0 px-6 py-14 md:px-24 md:py-28 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>{r.eyebrow}</Eyebrow>
              <SectionHeading id="referral-heading" lines={r.heading} className="mt-6" />
              <p className="mt-7 text-lg leading-relaxed text-muted md:text-[1.4rem]">{r.body}</p>
              <ButtonLink href={r.cta.href} className="mt-10">
                {r.cta.label}
              </ButtonLink>
            </div>
            <ul className="flex flex-col">
              {r.items.map((it, i) => {
                const Icon = ICONS[it.icon];
                return (
                  <li
                    key={it.title}
                    className={`flex gap-5 py-7 ${i > 0 ? "border-t border-dotted border-line" : "pt-0"}`}
                  >
                    <Icon aria-hidden className="mt-1.5 size-6 shrink-0 text-accent" />
                    <div>
                      <h3 className="font-display text-2xl font-bold md:text-[1.75rem]">{it.title}</h3>
                      <p className="mt-2 text-lg text-muted md:text-xl">{it.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function DeployPanel() {
  const d = copy.deploy;
  return (
    <section aria-labelledby="deploy-heading" className="py-16 md:py-28">
      <Container>
        <Reveal>
          <div className="grid items-center gap-14 rounded-[32px] bg-panel [&>*]:min-w-0 px-6 py-14 md:px-24 md:py-28 lg:grid-cols-2 lg:gap-16">
            <div>
              <Cloud aria-hidden className="size-8 text-accent" />
              <Eyebrow className="mt-6">{d.eyebrow}</Eyebrow>
              <SectionHeading id="deploy-heading" lines={d.heading} accent={[d.headingAccent]} className="mt-6" />
              <p className="mt-7 text-lg leading-relaxed text-muted md:text-[1.4rem]">{d.body}</p>
              <p className="mt-5 text-lg leading-relaxed text-muted md:text-[1.4rem]">{d.body2}</p>
              <ButtonLink href={d.cta.href} icon="download" className="mt-10">
                {d.cta.label}
              </ButtonLink>
            </div>
            <figure className="flex flex-col items-center gap-6">
              <div className="w-full">
                <div className="overflow-hidden rounded-2xl border border-line bg-bg-nav">
                  <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm">
                    <Wordmark className="text-lg" />
                    <span className="font-mono text-muted">{d.mock.title}</span>
                    <span className="ml-auto flex items-center gap-1 text-success">
                      <Check aria-hidden className="size-4" />
                      {d.mock.status}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-[1.4fr_1fr]">
                    <ol className="flex flex-col gap-1.5 bg-card p-5 font-mono text-xs leading-relaxed md:text-[13px]">
                      {d.mock.decisions.map((x) => {
                        const [action, ...rest] = x.split(/\s{2,}/);
                        return (
                          <li key={x} className="grid grid-cols-[8.5rem_1fr] gap-2">
                            <span className="text-accent">{action}</span>
                            <span className="break-words text-muted">{rest.join(" ")}</span>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="bg-card p-4">
                      <div className="h-full rounded-sm bg-paper p-4 text-paper-ink">
                        <p className="font-display font-bold">{d.mock.shortlistTitle}</p>
                        <ul className="mt-3 flex flex-col gap-2 font-mono text-xs">
                          {d.mock.shortlist.map((n) => (
                            <li key={n} className="flex items-center gap-2">
                              <CircleCheck aria-hidden className="size-3.5 text-[#227a6a]" />
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <Plate />
              </div>
              <ul className="flex gap-3">
                {d.pills.map((p) => (
                  <li key={p} className="rounded-full border border-line px-4 py-1.5 text-sm text-fg/90">
                    {p}
                  </li>
                ))}
              </ul>
              <figcaption className="text-muted">{d.caption}</figcaption>
            </figure>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function TerminalCard({ label, command }: { label: string; command: string }) {
  return (
    <div className="w-full overflow-hidden rounded-3xl bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-6 py-4">
        <span aria-hidden className="flex gap-2">
          <span className="size-3 rounded-full bg-line" />
          <span className="size-3 rounded-full bg-line" />
          <span className="size-3 rounded-full bg-line" />
        </span>
        <span className="ml-4 text-muted">{label}</span>
      </div>
      <pre className="px-6 py-10 font-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere] md:text-lg">
        <code>
          <span className="text-accent">$</span> {command}
        </code>
      </pre>
    </div>
  );
}

export function McpSection() {
  const m = copy.mcp;
  return (
    <section aria-labelledby="mcp-heading" className="py-16 md:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <Eyebrow>{m.eyebrow}</Eyebrow>
          <SectionHeading id="mcp-heading" lines={m.heading} className="mt-6" />
          <p className="mt-7 text-lg leading-relaxed text-muted md:text-[1.4rem]">{m.body}</p>
          <ul className="mt-7 text-lg md:text-xl">
            <CheckItem>{m.check}</CheckItem>
          </ul>
          <p className="mt-7">
            <TextLink href={m.link.href}>{m.link.label}</TextLink>
          </p>
        </Reveal>
        <Reveal>
          <TerminalCard label={m.terminalLabel} command={m.command} />
        </Reveal>
      </Container>
    </section>
  );
}

export function FinalCta() {
  const f = copy.finalCta;
  return (
    <section aria-labelledby="final-heading" className="py-24 md:py-40">
      <Container className="flex flex-col items-center text-center">
        <Reveal className="flex flex-col items-center">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <h2
            id="final-heading"
            className="mt-6 font-display text-[2.8rem] leading-[1.02] font-extrabold tracking-tight md:text-[6.2rem]"
          >
            {f.heading.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </h2>
          <p className="mt-8 text-lg text-muted md:text-[1.4rem]">{f.subtitle}</p>
          <ButtonLink href={f.button.href} className="mt-10">
            {f.button.label}
          </ButtonLink>
          <p className="mt-6 text-muted">{f.note}</p>
        </Reveal>
      </Container>
    </section>
  );
}

export function Footer() {
  const f = copy.footer;
  return (
    <footer className="bg-bg-nav py-14">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="flex items-baseline gap-6">
            <Wordmark className="text-3xl" />
            <span className="text-muted italic">{f.tagline}</span>
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-2 text-muted">
              {f.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="hover:text-fg"
                    {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-8 font-semibold text-fg">{f.note}</p>
        <p id="privacy" className="mt-2 text-sm text-muted">
          {f.privacy}
        </p>
      </Container>
    </footer>
  );
}
