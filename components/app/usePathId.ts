"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

/**
 * The id segment after `prefix` in a path, e.g. idFromPath("/app/runs/abc/", "/app/runs/") === "abc".
 * Null when there is no segment or it is the export placeholder "_".
 */
export function idFromPath(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const segment = path.slice(prefix.length).split("/")[0];
  if (!segment || segment === "_") return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

const noop = () => () => {};

/**
 * The id of a dynamic app page (run, patient, trial), read from the browser URL.
 *
 * The static export (S3 + CloudFront) has one placeholder page per dynamic route (`/app/runs/_`), and
 * the CloudFront Function serves it for every `/app/runs/<id>`. `useParams` would return "_" there, so
 * dynamic pages read the id from `window.location` instead. Null during prerender and before hydration.
 */
export function usePathId(prefix: string): string | null {
  usePathname(); // re-render on client-side navigation; the snapshot below then re-reads the URL
  const path = useSyncExternalStore(
    noop,
    () => window.location.pathname,
    () => null,
  );
  return path === null ? null : idFromPath(path, prefix);
}
