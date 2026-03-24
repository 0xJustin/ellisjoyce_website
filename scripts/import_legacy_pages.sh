#!/usr/bin/env bash
set -euo pipefail

if [ ! -f archive/LATEST_BACKUP.txt ]; then
  echo "archive/LATEST_BACKUP.txt not found. Run backup step first." >&2
  exit 1
fi

backup_dir=$(cat archive/LATEST_BACKUP.txt)
pages_dir="$backup_dir/pages"

if [ ! -d "$pages_dir" ]; then
  echo "Backup pages directory not found: $pages_dir" >&2
  exit 1
fi

# Default output for Astro static copies; can be overridden for custom workflows.
target_root="${LEGACY_OUTPUT_DIR:-public}"

# Routes that should remain available as legacy snapshots.
legacy_routes=(
  "/accomodations"
  "/bridal-party"
  "/details"
  "/ellis-joyce"
  "/ellis-joyce/animals-evidence"
  "/ellis-joyce/category/monthly"
  "/ellis-joyce/category/science"
  "/ellis-joyce/flywire-feedback"
  "/ellis-joyce/tag/science"
  "/ellisjoycemonthly"
  "/ellisjoycemonthly/blog-post-title-four-ps45a"
  "/ellisjoycemonthly/blog-post-title-one-85sfb"
  "/ellisjoycemonthly/blog-post-title-three-x6cs8"
  "/ellisjoycemonthly/blog-post-title-two-8ntkm"
  "/ellisjoycemonthly/category/monthly"
  "/ellisjoycemonthly/gwen-justin-jan-and-feb"
  "/ellisjoycemonthly/gwenjustin-november"
  "/ellisjoycemonthly/justin-gwen-december"
  "/ellisjoycemonthly/tag/monthly"
  "/photography/florida-2025"
  "/photography/md2024"
  "/photography/peru"
  "/registry"
  "/rsvp"
  "/shuttle-rsvp"
  "/weddinghome"
  "/weddingphotos"
)

to_slug() {
  local route="$1"
  if [ "$route" = "/" ]; then
    echo "root"
    return
  fi

  local slug="${route#/}"
  slug="${slug//\//_}"
  echo "$slug"
}

for route in "${legacy_routes[@]}"; do
  slug=$(to_slug "$route")
  src="$pages_dir/${slug}.html"

  if [ ! -f "$src" ]; then
    echo "Missing backup page for route $route ($src)" >&2
    exit 1
  fi

  target_dir="${target_root}${route}"
  mkdir -p "$target_dir"
  cp "$src" "$target_dir/index.html"
done

# Explicit redirect-like compatibility pages for old utility routes.
mkdir -p "${target_root}/home"
cat > "${target_root}/home/index.html" <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/" />
    <title>Redirecting…</title>
  </head>
  <body>
    Redirecting to <a href="/">home</a>.
  </body>
</html>
HTML

mkdir -p "${target_root}/cart" "${target_root}/search"
cat > "${target_root}/cart/index.html" <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/photography" />
    <title>Redirecting…</title>
  </head>
  <body>
    Redirecting to <a href="/photography">photography</a>.
  </body>
</html>
HTML

cat > "${target_root}/search/index.html" <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/blog" />
    <title>Redirecting…</title>
  </head>
  <body>
    Redirecting to <a href="/blog">blog</a>.
  </body>
</html>
HTML

echo "Imported ${#legacy_routes[@]} legacy routes into ./${target_root}"
