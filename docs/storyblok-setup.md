# Storyblok Setup

This project supports Storyblok as an optional content layer.
If Storyblok is unavailable or incomplete, the site falls back to local content files.

## 1. Add local env vars

```bash
cp .env.example .env
```

Set at least:

```bash
STORYBLOK_DELIVERY_API_TOKEN=your-token
```

Notes:
- Local development defaults to `draft` content.
- Production builds default to `published` content.
- Override with `STORYBLOK_CONTENT_VERSION=draft|published` if needed.

## 2. Create Storyblok content structure

Create these content types/components in Storyblok.

## 2.1 Home page

- Story slug: `home`
- Content type: `home_page`
- Fields:
  - `meta_title` (Text)
  - `meta_description` (Textarea)
  - `logo_image` (Asset)
  - `nav_links` (Blocks)
  - `profiles` (Blocks)
  - `photo_title` (Text)
  - `photo_href` (Text)
  - `photo_image` (Asset)
  - `photo_alt` (Text)
  - `contact_heading` (Text)
  - `contact_items` (Blocks)

Component for `nav_links` blocks:
- `nav_link`
  - `label` (Text)
  - `href` (Text)
  - `active` (Boolean)

Component for `profiles` blocks:
- `profile_card`
  - `css_class` (Text, e.g. `justin`, `gwen`)
  - `name` (Text)
  - `subtitle` (Text)
  - `href` (Text)
  - `image` (Asset)
  - `alt` (Text)

Component for `contact_items` blocks:
- `contact_item`
  - `label` (Text)
  - `href` (Text, optional: `mailto:`, `tel:`, or route)

## 2.2 Photography page

- Story slug: `photography`
- Content type: `photography_page`
- Fields:
  - `intro_title` (Text)
  - `intro_description` (Textarea)
  - `cta_primary_label` (Text)
  - `cta_primary_href` (Text)
  - `cta_secondary_label` (Text)
  - `cta_secondary_href` (Text)
  - `trips` (Blocks)

Component for `trips` blocks:
- `trip_card`
  - `slug` (Text, optional)
  - `title` (Text)
  - `year` (Text)
  - `location` (Text)
  - `summary` (Textarea)
  - `legacy_path` (Text)
  - `cover_image` (Asset)
  - `highlights` (Assets, multi-select)

## 2.3 Blog posts

- Folder slug: `blog`
- Content type in folder: `blog_post`
- Required fields:
  - `title` (Text)
  - `section` (Text, e.g. `Science`, `Monthly`, `Research`)
  - `excerpt` (Textarea)
  - `published_at` (Datetime)
  - `cover_image` (Asset, optional)
  - `body` (Richtext) or `body_html` (Textarea with HTML)
  - `legacy_path` (Text, optional)

Each post should be a story under `blog/`, for example:
- `blog/my-first-new-post`

The route will be generated at:
- `/blog/my-first-new-post`

## 3. Run locally

```bash
npm run dev
```

Then open `http://localhost:4321`.

## 4. Build + deploy

```bash
npm run build
npx firebase deploy --only hosting
```

## Content behavior summary

- Homepage pulls from Storyblok story `home`.
- Photography page pulls from Storyblok story `photography`.
- Blog index and `/blog/[slug]` merge:
  - legacy posts from `src/data/legacyPosts.ts`
  - Storyblok posts from `blog/*`
- If Storyblok token or stories are missing, local fallback content remains active.
