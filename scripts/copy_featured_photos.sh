#!/usr/bin/env bash
set -euo pipefail

backup_dir=$(cat archive/LATEST_BACKUP.txt)
root="$backup_dir/mirror/images.squarespace-cdn.com/content/v1/65e5512ebe37916a7b4514b7"
# Astro serves from public/ and emits to dist/ at build time.
out="${PHOTOS_OUTPUT_DIR:-public/assets/images/photography}"
mkdir -p "$out"

# Source target filename map
map=(
  "1740971144115-U71R28LVY9337879GJZA/FloridaFeb2025+(20000105+of+99)+(1).jpg:florida-01.jpg"
  "d8d0357b-d6ac-4955-b3c2-a944b3caaa8d/FloridaFeb2025+(20000032+of+99).jpg:florida-02.jpg"
  "bdea09f2-0348-49f5-91a3-0c6443d37dd0/BirdFavesPeru+(20000076+of+128).jpg:peru-01.jpg"
  "c47d875c-6f58-4ae1-ba64-7b5880b357bd/BirdFavesPeru+(20000141+of+128).jpg:peru-02.jpg"
  "af08aced-bb13-423f-aaa1-6178d9490886/SpringFaves+(20000094+of+86).jpg:midatlantic-01.jpg"
  "a6d73e68-decb-4b1f-9926-7819d9058fab/SpringFaves+(20000099+of+86).jpg:midatlantic-02.jpg"
)

for pair in "${map[@]}"; do
  src_rel="${pair%%:*}"
  out_name="${pair##*:}"
  src="$root/$src_rel"

  if [ ! -f "$src" ]; then
    echo "Missing source photo: $src" >&2
    exit 1
  fi

  cp "$src" "$out/$out_name"
done

echo "Copied ${#map[@]} featured photos into $out"
