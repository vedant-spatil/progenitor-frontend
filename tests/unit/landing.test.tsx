import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { recordLines } from "@/components/landing/PatientPane";
import { PreviewSection } from "@/components/landing/PreviewWindow";
import { THEME_KEY, ThemeToggle } from "@/components/landing/ThemeToggle";
import { copy } from "@/content/landing/copy";
import { patients } from "@/content/landing/patients";

describe("SegmentedControl in the preview", () => {
  it("switches the fixture in both panes", () => {
    render(<PreviewSection />);
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Jordan Reyes, 58")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "A CKD patient" }));

    expect(within(panel).getByText("Sam Whitfield, 67")).toBeTruthy();
    expect(within(panel).getByText(/"sam-whitfield"/)).toBeTruthy(); // record pane
    expect(within(panel).getByText("Kidney transplant readiness programme")).toBeTruthy(); // shortlist pane
    expect(within(panel).queryByText("Jordan Reyes, 58")).toBeNull();
  });

  it("moves the selection with arrow keys, Home and End", () => {
    render(<PreviewSection />);
    const first = screen.getByRole("tab", { name: "A diabetes patient" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "A breast cancer patient" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement?.textContent).toBe("A breast cancer patient");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("tab", { name: "A CKD patient" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" }); // wraps around
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("tab").filter((t) => t.tabIndex === 0)).toHaveLength(1);
  });

  it("replays the match animation without changing the patient", () => {
    render(<PreviewSection />);
    fireEvent.click(screen.getByRole("button", { name: "Match" }));
    expect(screen.getByText("Jordan Reyes, 58")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(copy.preview.toast);
  });
});

describe("ThemeToggle", () => {
  it("switches the theme and persists the choice", () => {
    render(<ThemeToggle label="Switch colour theme" />);
    const button = screen.getByRole("button", { name: "Switch colour theme" });
    fireEvent.click(button);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    fireEvent.click(button);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });
});

function strings(value: unknown, path = "copy"): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

describe("copy", () => {
  it("has no empty strings", () => {
    const empty = strings(copy).filter(([, s]) => s.trim() === "");
    expect(empty).toEqual([]);
  });

  it("carries the required notices", () => {
    expect(copy.hero.badgeText).toContain("Synthetic");
    expect(copy.footer.note).toContain("Not for clinical use");
    expect(copy.preview.caption).toContain("Not for clinical use");
  });

  it("preview fixtures are complete and cite evidence for every met or not-met verdict", () => {
    expect(patients.map((p) => p.tab)).toEqual(["A diabetes patient", "A breast cancer patient", "A CKD patient"]);
    for (const p of patients) {
      expect(strings(p).filter(([, s]) => s.trim() === "")).toEqual([]);
      expect(p.trials).toHaveLength(3);
      for (const c of p.trials.flatMap((t) => t.criteria)) {
        if (c.status !== "unknown") expect(c.evidence, `${p.id}: ${c.text}`).toBeTruthy();
      }
    }
  });

  it("formats a record as compact numbered JSON", () => {
    const lines = recordLines({ id: "x", labs: [{ loinc: "4548-4", value: "8.4 %" }] });
    expect(lines).toEqual(["{", '  "id": "x",', '  "labs": [', '    { "loinc": "4548-4", "value": "8.4 %" }', "  ]", "}"]);
    expect(JSON.parse(lines.join("\n"))).toEqual({ id: "x", labs: [{ loinc: "4548-4", value: "8.4 %" }] });
  });
});
