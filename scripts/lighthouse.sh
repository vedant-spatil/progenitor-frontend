#!/bin/sh
# Lighthouse CI (Gate 7a). Uses Playwright's headless Chromium when CHROME_PATH is not set,
# so no separate Chrome install is needed. Thresholds live in lighthouserc.json.
set -eu
if [ -z "${CHROME_PATH:-}" ]; then
  CHROME_PATH=$(ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | tail -1 || true)
  if [ -z "$CHROME_PATH" ]; then
    echo "No Chromium found: run 'npx playwright install chromium' or set CHROME_PATH" >&2
    exit 2
  fi
  export CHROME_PATH
fi
# On WSL, chrome-launcher names its temp profile with a Windows path, which lands in the current
# folder as "C:\Users\...\lighthouse.*". Remove those after the run (status kept).
status=0
npx lhci autorun || status=$?
find . -maxdepth 1 -name 'C:*lighthouse.*' -exec rm -rf {} + 2>/dev/null || true
exit $status
