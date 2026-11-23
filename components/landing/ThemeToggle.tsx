"use client";

import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "theme";

/** Flips data-theme on <html> and saves the choice. The boot script in app/layout.tsx restores it. */
export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked (private mode): the theme still switches for this page view.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded-full text-fg/80 hover:text-fg"
    >
      {/* Icon follows the theme through CSS, so server and client render the same markup. */}
      <Sun aria-hidden className="size-5 light:hidden" />
      <Moon aria-hidden className="hidden size-5 light:block" />
    </button>
  );
}
