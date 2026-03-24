# Migration Plan and Status

## Completed
- URL inventory captured from live sitemap + crawl.
- Snapshot backup created in `archive/`.
- Astro scaffold and build pipeline configured (`src/pages` -> `dist`).
- Legacy sentimental URLs imported at original paths through `public/`.
- Dist-based route coverage verification wired to migration manifest.
- Release scripts for S3 deploy + local/live smoke testing added.

## In progress
- Content polish for CV sections and biography details.
- Blog migration from legacy routes to clean canonical post paths.
- Photography business funnel (contact form, print/licensing detail pages).

## Pending user-assisted tasks
- Domain/DNS cutover credentials.
- Decision on primary email addresses for contact and photography inquiries.
- Final confirmation of keep/drop behavior for utility routes.
