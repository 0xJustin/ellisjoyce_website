#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/smoke_test_routes.sh <base-url> [routes-file]" >&2
  echo "Example: bash scripts/smoke_test_routes.sh https://www.ellis-joyce.com migration/crawled_paths.txt" >&2
  exit 1
fi

base_url="${1%/}"
routes_file="${2:-migration/crawled_paths.txt}"

if [ ! -f "$routes_file" ]; then
  echo "Routes file not found: $routes_file" >&2
  exit 1
fi

tmp_body="/tmp/smoke-routes-$$.body"
trap 'rm -f "$tmp_body"' EXIT

fail=0
count=0

while IFS= read -r route_path; do
  [ -z "$route_path" ] && continue
  url="${base_url}${route_path}"

  code="$(curl -sS -L --max-time 25 -o "$tmp_body" -w '%{http_code}' "$url" || true)"
  if [[ "$code" =~ ^[0-9]{3}$ ]] && [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    printf 'OK   %s %s\n' "$code" "$route_path"
  else
    printf 'FAIL %s %s\n' "$code" "$route_path"
    fail=1
  fi

  count=$((count + 1))
done < "$routes_file"

# Validate key static files as part of release confidence.
for static_path in /robots.txt /sitemap-index.xml; do
  code="$(curl -sS -L --max-time 25 -o "$tmp_body" -w '%{http_code}' "${base_url}${static_path}" || true)"
  if [[ "$code" =~ ^[0-9]{3}$ ]] && [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    printf 'OK   %s %s\n' "$code" "$static_path"
  else
    printf 'FAIL %s %s\n' "$code" "$static_path"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "Smoke test failed." >&2
  exit 1
fi

echo "Smoke test passed for ${count} routes from ${routes_file}."
