import {
  ArrowDownToLine,
  BookOpen,
  ChartColumn,
  Check,
  ChevronRight,
  FileHeart,
  FileSignature,
  Link as LinkIcon,
  ListChecks,
  Scale,
  ScrollText,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

// Small shared pieces of the landing page.

export const ICONS: Record<string, LucideIcon> = {
  "file-heart": FileHeart,
  search: Search,
  "list-checks": ListChecks,
  scale: Scale,
  "book-open": BookOpen,
  sparkles: Sparkles,
  "scroll-text": ScrollText,
  link: LinkIcon,
  "file-signature": FileSignature,
  "bar-chart": ChartColumn,
  download: ArrowDownToLine,
};

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1650px] px-4 sm:px-8 lg:px-12 ${className}`}>{children}</div>;
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      pro<span className="text-accent">gen</span>itor
    </span>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-lg font-semibold text-accent md:text-xl ${className}`}>{children}</p>;
}

/** Two-line serif section heading; `accent` lines render in the accent colour. */
export function SectionHeading({
  id,
  lines,
  accent = [],
  className = "",
}: {
  id?: string;
  lines: readonly string[];
  accent?: readonly string[];
  className?: string;
}) {
  return (
    <h2 id={id} className={`font-display text-[2.4rem] leading-[1.05] font-bold tracking-tight md:text-[4.25rem] ${className}`}>
      {lines.map((l) => (
        <span key={l} className="block">
          {l}
        </span>
      ))}
      {accent.map((l) => (
        <span key={l} className="block text-accent">
          {l}
        </span>
      ))}
    </h2>
  );
}

const external = (href: string) => href.startsWith("http");

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon = "chevron",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  icon?: "chevron" | "download" | "none";
  className?: string;
}) {
  const base =
    "inline-flex h-14 items-center justify-center gap-3 rounded-[10px] px-7 text-lg font-bold transition-colors md:h-16 md:px-8 md:text-xl";
  const look =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:brightness-105"
      : "border border-fg/40 text-fg hover:border-fg/70";
  const Icon = icon === "download" ? ArrowDownToLine : icon === "chevron" ? ChevronRight : null;
  return (
    <Link
      href={href}
      className={`${base} ${look} ${className}`}
      {...(external(href) ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
      {Icon && <Icon aria-hidden className="size-5" />}
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-lg font-bold text-accent underline underline-offset-4 md:text-xl"
      {...(external(href) ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-muted">
      <Check aria-hidden className="size-5 shrink-0 text-success" />
      <span>{children}</span>
    </li>
  );
}

export function IconTile({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={`inline-flex size-14 items-center justify-center rounded-xl bg-accent-soft ${className}`}>
      <Icon aria-hidden className="size-6 text-accent" />
    </span>
  );
}

/** Laptop-like plate under a mock window. */
export function Plate() {
  return <div aria-hidden className="mx-[6%] h-8 rounded-b-[40px] bg-plate md:h-11" />;
}
