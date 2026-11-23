import { ChevronRight } from "lucide-react";
import { copy } from "@/content/landing/copy";
import { ButtonLink, CheckItem, Container } from "./ui";

export function BadgePill() {
  const { badgeTag, badgeText } = copy.hero;
  return (
    <a
      href="#how-it-works"
      className="inline-flex items-center gap-3 rounded-full border border-line py-1.5 pr-4 pl-1.5 text-sm hover:border-fg/40 md:text-lg"
    >
      <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent">{badgeTag}</span>
      <span className="text-fg">{badgeText}</span>
      <ChevronRight aria-hidden className="size-4 text-fg/70" />
    </a>
  );
}

export function CheckRow({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col items-center justify-center gap-x-9 gap-y-2 text-base sm:flex-row md:text-lg">
      {items.map((i) => (
        <CheckItem key={i}>{i}</CheckItem>
      ))}
    </ul>
  );
}

export function Hero() {
  const { eyebrow, lines, subtitle, primary, secondary, checks } = copy.hero;
  return (
    <section aria-labelledby="hero-heading" className="pt-20 pb-16 md:pt-36 md:pb-24">
      <Container className="flex flex-col items-center text-center">
        <BadgePill />
        <p className="mt-10 text-lg font-semibold text-accent md:text-xl">{eyebrow}</p>
        <h1
          id="hero-heading"
          className="mt-6 font-display text-[3.1rem] leading-[1.02] font-extrabold tracking-tight sm:text-7xl md:text-[6.6rem]"
        >
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line.map((part) => (
                <span key={part.text} className={"accent" in part && part.accent ? "text-accent" : undefined}>
                  {part.text}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="mt-10 max-w-[56rem] text-lg leading-relaxed text-muted md:text-[1.4rem]">{subtitle}</p>
        <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-4 sm:w-auto sm:flex-row">
          <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
          <ButtonLink href={secondary.href} variant="secondary" icon="none">
            {secondary.label}
          </ButtonLink>
        </div>
        <div className="mt-9">
          <CheckRow items={checks} />
        </div>
      </Container>
    </section>
  );
}
