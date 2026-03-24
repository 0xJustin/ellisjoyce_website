#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/release_to_s3.sh <bucket-name> [distribution-id] [base-url]" >&2
  echo "Example: bash scripts/release_to_s3.sh ellis-joyce-site E123ABCXYZ https://www.ellis-joyce.com" >&2
  exit 1
fi

bucket="$1"
distribution_id="${2:-}"
base_url="${3:-}"

echo "Preparing dist artifact ..."
bash scripts/prepare_dist.sh

echo "Deploying dist artifact ..."
bash scripts/deploy_dist_to_s3.sh "$bucket" "$distribution_id" "$base_url"
