import { getStoryblokStory, listStoryblokStories } from "../lib/storyblokClient";
import { photographyTrips, type PhotographyTrip } from "./photographyTrips";

export interface HomeNavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface HomeProfileCard {
  cssClass: string;
  name: string;
  subtitle: string;
  href: string;
  image: string;
  alt: string;
}

export interface ContactLine {
  label: string;
  href?: string;
}

export interface HomePageContent {
  metaTitle: string;
  metaDescription: string;
  logoImage: string;
  logoAlt: string;
  navLinks: HomeNavLink[];
  profiles: HomeProfileCard[];
  photoTitle: string;
  photoHref: string;
  photoImage: string;
  photoAlt: string;
  contactHeading: string;
  contactLines: ContactLine[];
}

export interface PhotographyPageContent {
  title: string;
  description: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  trips: PhotographyTrip[];
}

export interface StoryblokBlogPost {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
  publishedAt: string;
  publishedLabel: string;
  coverImage: string | null;
  bodyHtml: string | null;
  bodyRichText: Record<string, unknown> | null;
  legacyPath: string | null;
}

interface StoryblokHomeContent extends Record<string, unknown> {
  meta_title?: unknown;
  meta_description?: unknown;
  logo_image?: unknown;
  nav_links?: unknown;
  profiles?: unknown;
  photo_title?: unknown;
  photo_href?: unknown;
  photo_image?: unknown;
  photo_alt?: unknown;
  contact_heading?: unknown;
  contact_items?: unknown;
}

interface StoryblokPhotographyContent extends Record<string, unknown> {
  intro_title?: unknown;
  intro_description?: unknown;
  cta_primary_label?: unknown;
  cta_primary_href?: unknown;
  cta_secondary_label?: unknown;
  cta_secondary_href?: unknown;
  trips?: unknown;
}

interface StoryblokBlogContent extends Record<string, unknown> {
  title?: unknown;
  section?: unknown;
  excerpt?: unknown;
  published_at?: unknown;
  cover_image?: unknown;
  body_html?: unknown;
  body?: unknown;
  legacy_path?: unknown;
}

const MAX_EXCERPT_LENGTH = 220;

const homeFallback: HomePageContent = {
  metaTitle: "Gwendolyn and Justin Ellis-Joyce",
  metaDescription: "Research, writing, and photography by Gwen and Justin Ellis-Joyce.",
  logoImage: "/assets/images/branding/mountaineer.webp",
  logoAlt: "Gwendolyn and Justin Ellis-Joyce",
  navLinks: [
    { label: "Home", href: "/", active: true },
    { label: "Photography", href: "/photography" },
    { label: "Ellis-Joyce Blog", href: "/blog" },
  ],
  profiles: [
    {
      cssClass: "justin",
      name: "Justin's",
      subtitle: "Site and CV",
      href: "/justin",
      image: "/assets/images/home/justin.jpg",
      alt: "Justin portrait",
    },
    {
      cssClass: "gwen",
      name: "Gwendolyn's",
      subtitle: "Site and CV",
      href: "/gwen",
      image: "/assets/images/home/gwen.jpg",
      alt: "Gwendolyn portrait",
    },
  ],
  photoTitle: "Photography",
  photoHref: "/photography",
  photoImage: "/assets/images/home/photography.jpg",
  photoAlt: "Photography highlight",
  contactHeading: "Contact",
  contactLines: [
    { label: "justin@ellis-joyce.com", href: "mailto:justin@ellis-joyce.com" },
    { label: "gqjellis27@gmail.com", href: "mailto:gqjellis27@gmail.com" },
    { label: "203-788-9799" },
  ],
};

const photographyFallback: PhotographyPageContent = {
  title: "Trip archives and field highlights.",
  description:
    "The structure stays organized by trip, matching the original layout direction, while keeping room for future print sales, licensing, and outreach workflows.",
  ctaPrimaryLabel: "Licensing / Prints Inquiry",
  ctaPrimaryHref: "mailto:justin@ellis-joyce.com",
  ctaSecondaryLabel: "Open Latest Full Gallery",
  ctaSecondaryHref: "/photography/florida-2025",
  trips: photographyTrips,
};

let cachedHomeContent: HomePageContent | null = null;
let cachedPhotographyContent: PhotographyPageContent | null = null;
let cachedStoryblokPosts: StoryblokBlogPost[] | null = null;

export async function getHomePageContent(): Promise<HomePageContent> {
  if (cachedHomeContent) {
    return cachedHomeContent;
  }

  const story = await getStoryblokStory<StoryblokHomeContent>("home");
  if (!story) {
    cachedHomeContent = homeFallback;
    return cachedHomeContent;
  }

  const content = mapHomeContent(story.content);
  cachedHomeContent = content;
  return content;
}

export async function getPhotographyPageContent(): Promise<PhotographyPageContent> {
  if (cachedPhotographyContent) {
    return cachedPhotographyContent;
  }

  const story = await getStoryblokStory<StoryblokPhotographyContent>("photography");
  if (!story) {
    cachedPhotographyContent = photographyFallback;
    return cachedPhotographyContent;
  }

  const content = mapPhotographyContent(story.content);
  cachedPhotographyContent = content;
  return content;
}

export async function getStoryblokBlogPosts(): Promise<StoryblokBlogPost[]> {
  if (cachedStoryblokPosts) {
    return cachedStoryblokPosts;
  }

  const stories = await listStoryblokStories<StoryblokBlogContent>({
    starts_with: "blog/",
    is_startpage: "0",
    per_page: "100",
    sort_by: "published_at:desc",
  });

  const posts = stories
    .map(mapStoryblokBlogPost)
    .filter((post): post is StoryblokBlogPost => post !== null)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  cachedStoryblokPosts = posts;
  return posts;
}

function mapHomeContent(content: StoryblokHomeContent): HomePageContent {
  const navLinks = mapNavLinks(content.nav_links);
  const profiles = mapProfiles(content.profiles);
  const contactLines = mapContactLines(content.contact_items);

  return {
    metaTitle: asString(content.meta_title) ?? homeFallback.metaTitle,
    metaDescription: asString(content.meta_description) ?? homeFallback.metaDescription,
    logoImage: asAssetUrl(content.logo_image) ?? homeFallback.logoImage,
    logoAlt: homeFallback.logoAlt,
    navLinks: navLinks.length > 0 ? navLinks : homeFallback.navLinks,
    profiles: profiles.length > 0 ? profiles : homeFallback.profiles,
    photoTitle: asString(content.photo_title) ?? homeFallback.photoTitle,
    photoHref: asHref(content.photo_href) ?? homeFallback.photoHref,
    photoImage: asAssetUrl(content.photo_image) ?? homeFallback.photoImage,
    photoAlt: asString(content.photo_alt) ?? homeFallback.photoAlt,
    contactHeading: asString(content.contact_heading) ?? homeFallback.contactHeading,
    contactLines: contactLines.length > 0 ? contactLines : homeFallback.contactLines,
  };
}

function mapPhotographyContent(content: StoryblokPhotographyContent): PhotographyPageContent {
  const trips = mapTrips(content.trips);

  return {
    title: asString(content.intro_title) ?? photographyFallback.title,
    description: asString(content.intro_description) ?? photographyFallback.description,
    ctaPrimaryLabel: asString(content.cta_primary_label) ?? photographyFallback.ctaPrimaryLabel,
    ctaPrimaryHref: asHref(content.cta_primary_href) ?? photographyFallback.ctaPrimaryHref,
    ctaSecondaryLabel: asString(content.cta_secondary_label) ?? photographyFallback.ctaSecondaryLabel,
    ctaSecondaryHref: asHref(content.cta_secondary_href) ?? photographyFallback.ctaSecondaryHref,
    trips: trips.length > 0 ? trips : photographyFallback.trips,
  };
}

function mapStoryblokBlogPost(story: {
  name: string;
  full_slug: string;
  published_at?: string;
  first_published_at?: string;
  content: StoryblokBlogContent;
}): StoryblokBlogPost | null {
  const slug = story.full_slug.replace(/^blog\//, "").replace(/\/$/, "");
  if (!slug || slug.includes("/")) {
    return null;
  }

  const publishedAt =
    asString(story.content.published_at) ??
    story.first_published_at ??
    story.published_at ??
    new Date(0).toISOString();

  const bodyHtml = asString(story.content.body_html);
  const bodyRichText = asRecord(story.content.body);

  const title = asString(story.content.title) ?? story.name;
  const excerpt =
    asString(story.content.excerpt) ??
    buildExcerpt(
      bodyHtml ?? extractTextFromStoryblokRichText(bodyRichText),
      `${title} was published on the Ellis-Joyce blog.`,
    );

  return {
    slug,
    title,
    section: asString(story.content.section) ?? "Storyblok",
    excerpt,
    publishedAt,
    publishedLabel: formatDateLabel(publishedAt),
    coverImage: asAssetUrl(story.content.cover_image),
    bodyHtml,
    bodyRichText,
    legacyPath: asHref(story.content.legacy_path) ?? null,
  };
}

function mapNavLinks(value: unknown): HomeNavLink[] {
  return asObjectArray(value)
    .map((entry) => {
      const label = asString(entry.label);
      const href = normalizeHomeNavHref(asHref(entry.href));
      if (!label || !href) {
        return null;
      }

      const active = asBoolean(entry.active);
      return {
        label,
        href,
        ...(active !== undefined ? { active } : {}),
      };
    })
    .filter(isNonNull);
}

function mapProfiles(value: unknown): HomeProfileCard[] {
  return asObjectArray(value)
    .map((entry, index) => {
      const name = asString(entry.name);
      const href = asHref(entry.href);
      const image = asAssetUrl(entry.image);
      if (!name || !href || !image) {
        return null;
      }

      return {
        cssClass: slugify(asString(entry.css_class) ?? name) || `profile-${index + 1}`,
        name,
        subtitle: asString(entry.subtitle) ?? "Site and CV",
        href,
        image,
        alt: asString(entry.alt) ?? `${name} portrait`,
      };
    })
    .filter(isNonNull);
}

function mapContactLines(value: unknown): ContactLine[] {
  return asObjectArray(value)
    .map((entry) => {
      const label = asString(entry.label);
      if (!label) {
        return null;
      }

      const href = asHref(entry.href);
      return {
        label,
        ...(href ? { href } : {}),
      };
    })
    .filter(isNonNull);
}

function mapTrips(value: unknown): PhotographyTrip[] {
  return asObjectArray(value)
    .map((entry, index) => {
      const title = asString(entry.title);
      if (!title) {
        return null;
      }

      const slug = slugify(asString(entry.slug) ?? title) || `trip-${index + 1}`;
      const coverImage = asAssetUrl(entry.cover_image);
      if (!coverImage) {
        return null;
      }

      const highlights = asAssetUrlArray(entry.highlights);
      const rating = normalizeTripRating(entry.rating ?? entry.star_rating ?? entry.spotlight_score);
      const showOnPhotographyPage = asBoolean(entry.show_on_photography_page ?? entry.show_on_page ?? entry.visible);

      return {
        slug,
        title,
        year: asString(entry.year) ?? "",
        legacyPath: asHref(entry.legacy_path) ?? `/photography/${slug}`,
        coverImage,
        highlights: highlights.length > 0 ? highlights : [coverImage],
        ...(rating !== null ? { rating } : {}),
        ...(showOnPhotographyPage !== undefined ? { showOnPhotographyPage } : {}),
      };
    })
    .filter(isNonNull);
}

function buildExcerpt(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= MAX_EXCERPT_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_EXCERPT_LENGTH).trimEnd()}...`;
}

function extractTextFromStoryblokRichText(value: Record<string, unknown> | null): string {
  if (!value) {
    return "";
  }

  const chunks: string[] = [];

  walkRichText(value, chunks);
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

function walkRichText(node: unknown, chunks: string[]): void {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      walkRichText(child, chunks);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  const text = asString(record.text);
  if (text) {
    chunks.push(text);
  }

  const content = record.content;
  if (Array.isArray(content)) {
    walkRichText(content, chunks);
  }
}

function formatDateLabel(dateValue: string): string {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.valueOf())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  return undefined;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeTripRating(value: unknown): number | null {
  const numeric = asNumber(value);
  if (numeric === null) {
    return null;
  }

  const rounded = Math.round(numeric);
  if (rounded < 1 || rounded > 5) {
    return null;
  }

  return rounded;
}

function asHref(value: unknown): string | null {
  const href = asString(value);
  if (!href) {
    return null;
  }

  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }

  return href.startsWith("/") ? href : `/${href}`;
}

function normalizeHomeNavHref(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value === "/ellis-joyce" || value === "/ellis-joyce/") {
    return "/blog";
  }

  return value;
}

function asAssetUrl(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const filename = (value as { filename?: unknown }).filename;
  return asString(filename);
}

function asAssetUrlArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asAssetUrl(item))
    .filter((item): item is string => !!item);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
