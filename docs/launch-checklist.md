# Launch Checklist

## Pre-cutover
1. Confirm production values:
   - S3 bucket name
   - CloudFront distribution ID
   - Final base URL (`https://www.ellis-joyce.com`)
2. Build and validate artifact:
   - `npm run prepareDist`
3. Optional dry-run upload preview:
   - `DRY_RUN=1 bash scripts/deploy_dist_to_s3.sh <bucket-name> <distribution-id>`
4. Confirm CloudFront custom domains and certificate:
   - `ellis-joyce.com`
   - `www.ellis-joyce.com`
5. Confirm custom error mapping:
   - `404` -> `/404.html`

## Cutover
1. Release to S3/CloudFront:
   - `npm run releaseS3 -- <bucket-name> <distribution-id> https://www.ellis-joyce.com`
2. Update DNS records to CloudFront target.
3. Wait for DNS and edge propagation.
4. Run live smoke test:
   - `npm run smoke -- https://www.ellis-joyce.com`

## Post-cutover checks
1. Confirm key legacy pages:
   - `/weddinghome/`
   - `/details/`
   - `/registry/`
   - `/weddingphotos/`
2. Confirm modern pages:
   - `/`
   - `/justin/`
   - `/gwen/`
   - `/blog/`
   - `/photography/`
3. Confirm sitemap and robots:
   - `/sitemap-index.xml`
   - `/robots.txt`

## Rollback
1. Re-sync prior known-good `dist/` artifact to S3.
2. Invalidate CloudFront:
   - `aws cloudfront create-invalidation --distribution-id <id> --paths '/*'`
3. Re-run smoke checks.
