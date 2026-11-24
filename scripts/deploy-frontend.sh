#!/usr/bin/env bash
# Build the static export and publish it to S3 behind CloudFront (ADR 0008, Phase 8 step 4).
#
# Run from anywhere: ./scripts/deploy-frontend.sh (uses npm if installed, else Docker).
# Needs: WEB_BUCKET, CF_DISTRIBUTION_ID, EXPECT_ACCOUNT. Taken from the environment, else read (only these
# keys) from the backend .env (ENV_FILE, default ../backend/.env). AWS credentials: the EC2 instance role
# (s3:ListBucket, s3:PutObject, s3:DeleteObject on the bucket; cloudfront:CreateInvalidation).
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-../backend/.env}"

from_env_file() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '"'"'"
}

WEB_BUCKET="${WEB_BUCKET:-$(from_env_file WEB_BUCKET)}"
CF_DISTRIBUTION_ID="${CF_DISTRIBUTION_ID:-$(from_env_file CF_DISTRIBUTION_ID)}"
EXPECT_ACCOUNT="${EXPECT_ACCOUNT:-$(from_env_file EXPECT_ACCOUNT)}"
: "${WEB_BUCKET:?set WEB_BUCKET}" "${CF_DISTRIBUTION_ID:?set CF_DISTRIBUTION_ID}" "${EXPECT_ACCOUNT:?set EXPECT_ACCOUNT}"

account="$(aws sts get-caller-identity --query Account --output text)"
if [ "$account" != "$EXPECT_ACCOUNT" ]; then
  echo "AWS account is $account, expected $EXPECT_ACCOUNT. Stopping." >&2
  exit 1
fi

rm -rf out
if command -v npm >/dev/null 2>&1; then
  npm ci --no-audit --no-fund
  NEXT_OUTPUT=export NEXT_TELEMETRY_DISABLED=1 npm run build
else
  # No Node on the host (the EC2 stack builds the frontend in Docker): build in a glibc Node image so
  # node_modules native binaries match the host, as the current user so files stay owned by them.
  docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e NEXT_OUTPUT=export -e NEXT_TELEMETRY_DISABLED=1 \
    -v "$PWD":/app -w /app node:20-bookworm-slim sh -c "npm ci --no-audit --no-fund && npm run build"
fi
test -f out/app/runs/_.html || { echo "export is missing the run placeholder page" >&2; exit 1; }

# Hashed assets first (immutable), so new pages never point at files that are not uploaded yet.
aws s3 sync out/_next/static "s3://$WEB_BUCKET/_next/static" \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors
# Pages and router payloads: always revalidate. --delete removes pages that no longer exist; old hashed
# assets stay (excluded) so open tabs keep working.
aws s3 sync out "s3://$WEB_BUCKET" --delete --exclude "_next/static/*" \
  --cache-control "no-cache" --only-show-errors

aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/*" \
  --query Invalidation.Id --output text
echo "Deployed to s3://$WEB_BUCKET (distribution $CF_DISTRIBUTION_ID)."
