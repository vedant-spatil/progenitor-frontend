import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["SOFT"], display: "swap" });
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });
// Mono appears only below the fold: no preload, so it does not compete with the hero fonts.
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Progenitor: clinical trial matching, explained",
  description:
    "AI agents read a synthetic patient record, screen recruiting trials, and cite evidence for every eligibility rule. Research demo. Not for clinical use.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#140f0d" },
    { media: "(prefers-color-scheme: light)", color: "#f4ece1" },
  ],
};

// Runs before first paint: applies the saved theme (default dark) and marks JavaScript as available,
// which enables the scroll fade-in (content stays visible without JavaScript).
const bootScript = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
