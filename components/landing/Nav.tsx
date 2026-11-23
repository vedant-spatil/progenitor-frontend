import Link from "next/link";
import { copy } from "@/content/landing/copy";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Container, Wordmark } from "./ui";

export function Nav() {
  const { links, cta, menuLabel, themeLabel } = copy.nav;
  return (
    <header className="sticky top-0 z-50 border-b border-line/40 bg-bg-nav/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-3 md:h-20">
        <Link href="/" aria-label="Progenitor home" className="text-[1.4rem] sm:text-2xl md:text-[1.9rem]">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-9 text-lg text-fg/85">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-0.5 sm:gap-3">
          <ThemeToggle label={themeLabel} />
          <Link
            href={cta.href}
            className="inline-flex h-11 items-center rounded-[10px] whitespace-nowrap bg-accent px-2.5 text-[13px] font-bold text-accent-ink sm:px-5 sm:text-base md:h-14 md:px-6 md:text-lg"
          >
            {cta.label}
          </Link>
          <MobileMenu label={menuLabel} links={links} />
        </div>
      </Container>
    </header>
  );
}
