// Phase 8 step 4 (ADR 0008): dynamic pages in the static export read their id from the URL, and the
// CloudFront Function maps every id to the one exported placeholder page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { idFromPath } from "@/components/app/usePathId";

type Handler = (event: { request: { uri: string } }) => { uri: string };
const handler = new Function(
  `${readFileSync(join(process.cwd(), "scripts/cloudfront-spa.js"), "utf8")}; return handler;`,
)() as Handler;
const rewrite = (uri: string) => handler({ request: { uri } }).uri;

describe("idFromPath", () => {
  it("reads the segment after the prefix, with or without a trailing slash", () => {
    expect(idFromPath("/app/runs/3f2b6c1e-0000-4000-8000-000000000001", "/app/runs/")).toBe(
      "3f2b6c1e-0000-4000-8000-000000000001",
    );
    expect(idFromPath("/app/patients/12/", "/app/patients/")).toBe("12");
    expect(idFromPath("/app/trials/NCT01234567", "/app/trials/")).toBe("NCT01234567");
    expect(idFromPath("/app/trials/a%20b/", "/app/trials/")).toBe("a b");
  });

  it("is null for the placeholder, a missing segment, another section or a bad escape", () => {
    expect(idFromPath("/app/runs/_/", "/app/runs/")).toBeNull();
    expect(idFromPath("/app/runs/", "/app/runs/")).toBeNull();
    expect(idFromPath("/app/patients/12", "/app/runs/")).toBeNull();
    expect(idFromPath("/app/trials/%E0%A4%A", "/app/trials/")).toBeNull();
  });
});

describe("CloudFront Function progenitor-spa", () => {
  it("serves the placeholder page for every dynamic id", () => {
    expect(rewrite("/app/runs/abc")).toBe("/app/runs/_.html");
    expect(rewrite("/app/runs/abc/")).toBe("/app/runs/_.html");
    expect(rewrite("/app/patients/12")).toBe("/app/patients/_.html");
    expect(rewrite("/app/trials/NCT01234567")).toBe("/app/trials/_.html");
  });

  it("maps the client router's payload files to the placeholder too", () => {
    expect(rewrite("/app/runs/abc.txt")).toBe("/app/runs/_.txt");
    expect(rewrite("/app/runs/abc/__next.app.runs.$d$id.__PAGE__.txt")).toBe(
      "/app/runs/_/__next.app.runs.$d$id.__PAGE__.txt",
    );
  });

  it("maps other pages to their .html file", () => {
    expect(rewrite("/")).toBe("/index.html");
    expect(rewrite("/login")).toBe("/login.html");
    expect(rewrite("/login/")).toBe("/login.html");
    expect(rewrite("/app")).toBe("/app.html");
    expect(rewrite("/app/patients")).toBe("/app/patients.html");
    expect(rewrite("/app/runs/new")).toBe("/app/runs/new.html");
    expect(rewrite("/app/runs/new/")).toBe("/app/runs/new.html");
    expect(rewrite("/app/runs/_")).toBe("/app/runs/_.html");
  });

  it("leaves files with an extension alone", () => {
    expect(rewrite("/_next/static/chunks/main.js")).toBe("/_next/static/chunks/main.js");
    expect(rewrite("/favicon.ico")).toBe("/favicon.ico");
    expect(rewrite("/app/runs.txt")).toBe("/app/runs.txt");
    expect(rewrite("/app/runs/__next.app.runs.__PAGE__.txt")).toBe("/app/runs/__next.app.runs.__PAGE__.txt");
  });
});
