#!/usr/bin/env bash
set -euo pipefail

echo "Syncing legacy snapshots into public/ ..."
bash scripts/import_legacy_pages.sh

echo "Syncing featured photography assets into public/assets/ ..."
bash scripts/copy_featured_photos.sh

echo "Running Astro build ..."
npm run build

echo "Validating route coverage against migration manifest ..."
bash scripts/check_route_coverage.sh dist

if [ "${SKIP_SMOKE_TEST:-0}" != "1" ]; then
  echo "Running local smoke test against dist/ ..."
  bash scripts/local_dist_smoke.sh
fi

echo "Build artifact is ready in ./dist"
