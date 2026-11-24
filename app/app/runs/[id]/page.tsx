import RunView from "./view";

// One placeholder page per dynamic route ("_"), so the static export (S3 + CloudFront) can serve it for
// every id: the CloudFront Function rewrites /app/runs/<id> to it, and next.config rewrites do the same
// for the standalone server. The view reads the id from the URL (usePathId), not from params.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return <RunView />;
}
