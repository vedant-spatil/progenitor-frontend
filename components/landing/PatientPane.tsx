import type { ReactNode } from "react";

/** Compact JSON: scalars and short objects on one line, arrays of objects one item per line. */
export function recordLines(record: Record<string, unknown>): string[] {
  const lines = ["{"];
  const entries = Object.entries(record);
  entries.forEach(([k, v], i) => {
    const comma = i < entries.length - 1 ? "," : "";
    if (Array.isArray(v)) {
      lines.push(`  "${k}": [`);
      v.forEach((item, j) => lines.push(`    ${inline(item)}${j < v.length - 1 ? "," : ""}`));
      lines.push(`  ]${comma}`);
    } else {
      lines.push(`  "${k}": ${inline(v)}${comma}`);
    }
  });
  lines.push("}");
  return lines;
}

function inline(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return `{ ${Object.entries(v)
      .map(([k, x]) => `"${k}": ${JSON.stringify(x)}`)
      .join(", ")} }`;
  }
  return JSON.stringify(v);
}

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|([{}[\],])/g;

function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN)) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const key = `${m.index}`;
    if (m[1] && m[2]) {
      out.push(
        <span key={key} className="text-accent">
          {m[1]}
        </span>,
        m[2],
      );
    } else if (m[1]) {
      out.push(
        <span key={key} className="text-success">
          {m[1]}
        </span>,
      );
    } else if (m[3]) {
      out.push(
        <span key={key} className="text-warn">
          {m[3]}
        </span>,
      );
    } else {
      out.push(
        <span key={key} className="text-muted">
          {m[4]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function PatientPane({ record }: { record: Record<string, unknown> }) {
  const lines = recordLines(record);
  return (
    <ol className="py-5 font-mono text-[13px] leading-7 md:text-[15px]" aria-label="Synthetic patient record">
      {lines.map((line, i) => (
        <li key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)] pr-4">
          <span aria-hidden className="pr-3 text-right text-muted select-none">
            {i + 1}
          </span>
          <code className="whitespace-pre-wrap text-fg [overflow-wrap:anywhere]">{highlight(line)}</code>
        </li>
      ))}
    </ol>
  );
}
