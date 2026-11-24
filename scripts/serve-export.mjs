// Serves the static export (out/) the way S3 + CloudFront do, for Playwright (E2E_EXPORT=1).
// Paths go through the same CloudFront Function (scripts/cloudfront-spa.js). /api/* is not proxied:
// the e2e suites mock it with page.route.
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "..", "out");
const port = Number(process.env.PORT ?? 3100);
const handler = new Function(`${readFileSync(join(here, "cloudfront-spa.js"), "utf8")}; return handler;`)();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/internal/")) {
    res.writeHead(502).end("no backend in the export server");
    return;
  }
  const uri = handler({ request: { uri: url.pathname } }).uri;
  const file = normalize(join(root, decodeURIComponent(uri)));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    // S3 without s3:ListBucket answers a missing key with 403; no custom error page (ADR 0008).
    res.writeHead(403, { "content-type": "text/plain" }).end("AccessDenied");
  }
}).listen(port, () => console.log(`export server on http://localhost:${port}`));
