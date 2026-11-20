#!/bin/sh
# Lighthouse CI (Gate 7a). Thresholds live in lighthouserc.json.
#
# CPU calibration (ADR 0006, owner-approved 2026-11-20). Lighthouse simulates a mid-tier phone by slowing the
# host CPU 4x, which assumes a high-end desktop host. Its docs (docs/throttling.md, "Calibrating the CPU
# slowdown") give the multiplier per host class. One quick run reads the host's benchmarkIndex, then the asserted
# runs use the matching multiplier, so every machine emulates the same phone:
#   benchmarkIndex >= 1500 (high-end desktop) -> 4x   (default)
#   1000 - 1500    (low-end desktop)          -> 2x
#   800 - 1000     (high-end mobile class)    -> 2x
#   < 800                                     -> 1x
# Set LH_CPU_MULTIPLIER to skip calibration.
set -eu

if [ -z "${CHROME_PATH:-}" ]; then
  CHROME_PATH=$(ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | tail -1 || true)
  if [ -z "$CHROME_PATH" ]; then
    echo "No Chromium found: run 'npx playwright install chromium' or set CHROME_PATH" >&2
    exit 2
  fi
  export CHROME_PATH
fi

PORT=3200
CAL_DIR=$(mktemp -d)
cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$CAL_DIR"
  # On WSL, chrome-launcher names its temp profile with a Windows path, which lands in the current
  # folder as "C:\Users\...\lighthouse.*". Remove those.
  find . -maxdepth 1 -name 'C:*lighthouse.*' -exec rm -rf {} + 2>/dev/null || true
}
trap cleanup EXIT

if [ -z "${LH_CPU_MULTIPLIER:-}" ]; then
  npx next start -p "$PORT" >"$CAL_DIR/server.log" 2>&1 &
  SERVER_PID=$!
  i=0
  until curl -sf -o /dev/null "http://localhost:$PORT/"; do
    i=$((i + 1))
    [ "$i" -gt 60 ] && { echo "calibration: server did not start" >&2; exit 2; }
    sleep 1
  done
  npx lighthouse "http://localhost:$PORT/" --quiet --only-categories=performance --output=json \
    --output-path="$CAL_DIR/cal.json" --chrome-flags="--headless=new --no-sandbox" >/dev/null 2>&1
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  SERVER_PID=""
  BENCH=$(node -e 'console.log(Math.round(require(process.argv[1]).environment.benchmarkIndex))' "$CAL_DIR/cal.json")
  LH_CPU_MULTIPLIER=$(node -e '
    const b = Number(process.argv[1]);
    console.log(b >= 1500 ? 4 : b >= 800 ? 2 : 1);' "$BENCH")
  echo "Lighthouse CPU calibration: benchmarkIndex $BENCH -> cpuSlowdownMultiplier ${LH_CPU_MULTIPLIER}x"
fi

npx lhci autorun --collect.settings.throttling.cpuSlowdownMultiplier="$LH_CPU_MULTIPLIER"
