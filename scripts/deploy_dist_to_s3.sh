#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/deploy_dist_to_s3.sh <bucket-name> [distribution-id]" >&2
  echo "Example: bash scripts/deploy_dist_to_s3.sh ellis-joyce-site E123ABCXYZ" >&2
  exit 1
fi

bucket="$1"
distribution_id="${2:-}"
base_url="${3:-}"
dry_run_flag="${DRY_RUN:-0}"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required but not found in PATH." >&2
  exit 1
fi

if [ ! -d dist ]; then
  echo "dist/ not found. Run: npm run prepareDist" >&2
  exit 1
fi

dry_args=()
if [ "$dry_run_flag" = "1" ]; then
  dry_args+=(--dryrun)
fi

echo "Uploading HTML and metadata files to s3://${bucket}/ with revalidation-friendly cache headers ..."
aws s3 sync dist/ "s3://${bucket}/" \
  --delete \
  --exclude "assets/*" \
  --cache-control "public,max-age=0,must-revalidate" \
  "${dry_args[@]}"

if [ -d dist/assets ]; then
  echo "Uploading hashed/static assets with long-lived cache headers ..."
  aws s3 sync dist/assets/ "s3://${bucket}/assets/" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    "${dry_args[@]}"
fi

if [ -n "$distribution_id" ]; then
  echo "Creating CloudFront invalidation for distribution ${distribution_id} ..."
  aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths '/*'
fi

if [ -n "$base_url" ]; then
  echo "Running post-deploy smoke test against ${base_url} ..."
  bash scripts/smoke_test_routes.sh "$base_url"
fi

echo "Deploy complete."
