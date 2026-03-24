#!/usr/bin/env bash
set -euo pipefail

manifest="migration/url-manifest.csv"
build_dir="${1:-dist}"
missing=0

if [ ! -f "$manifest" ]; then
  echo "Missing manifest: $manifest" >&2
  exit 1
fi

if [ ! -d "$build_dir" ]; then
  echo "Missing build directory: $build_dir" >&2
  exit 1
fi

while IFS=, read -r raw_path _rest; do
  route=$(echo "$raw_path" | sed 's/^"//; s/"$//')
  [ -z "$route" ] && continue

  file="${build_dir}${route}/index.html"
  [ "$route" = "/" ] && file="${build_dir}/index.html"

  if [ ! -f "$file" ]; then
    echo "Missing route file: $route -> $file"
    missing=1
  fi
done < <(tail -n +2 "$manifest")

if [ "$missing" -eq 1 ]; then
  exit 1
fi

echo "Route coverage check passed against $manifest in ${build_dir}/"
