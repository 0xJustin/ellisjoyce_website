export interface LocalBlogPost {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
  publishedAt: string;
  publishedLabel: string;
  coverImage: string | null;
  bodyHtml: string;
  legacyPath: string | null;
  sourcePath: string;
}

interface LocalBlogFile {
  slug?: unknown;
  title?: unknown;
  section?: unknown;
  excerpt?: unknown;
  publishedAt?: unknown;
  coverImage?: unknown;
  bodyHtml?: unknown;
  bodyMarkdown?: unknown;
  legacyPath?: unknown;
}

const MAX_EXCERPT_LENGTH = 220;
const localPostModules = import.meta.glob("./localBlogEntries/*.json", {
  eager: true,
  import: "default",
}) as Record<string, LocalBlogFile>;

let cachedLocalPosts: LocalBlogPost[] | null = null;

export function getLocalBlogPosts(): LocalBlogPost[] {
  if (cachedLocalPosts) {
    return cachedLocalPosts;
  }

  const posts = Object.entries(localPostModules)
    .map(([sourcePath, rawPost], index) => mapLocalBlogPost(sourcePath, rawPost, index))
    .filter((post): post is LocalBlogPost => post !== null)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  cachedLocalPosts = posts;
  return posts;
}

function mapLocalBlogPost(sourcePath: string, rawPost: LocalBlogFile, index: number): LocalBlogPost | null {
  const bodyHtml = asString(rawPost.bodyHtml);
  const title = asString(rawPost.title);
  if (!bodyHtml || !title) {
    return null;
  }

  const fileSlug = sourcePath.match(/\/([^/]+)\.json$/)?.[1] ?? `local-post-${index + 1}`;
  const slug = slugify(asString(rawPost.slug) ?? fileSlug) || `local-post-${index + 1}`;
  const publishedAt = asString(rawPost.publishedAt) ?? new Date(0).toISOString();
  const excerpt =
    asString(rawPost.excerpt) ??
    buildExcerpt(stripHtml(bodyHtml), `${title} was published on the Ellis-Joyce blog.`);

  return {
    slug,
    title,
    section: asString(rawPost.section) ?? "Local Draft",
    excerpt,
    publishedAt,
    publishedLabel: formatDateLabel(publishedAt),
    coverImage: asHref(rawPost.coverImage),
    bodyHtml,
    legacyPath: asHref(rawPost.legacyPath),
    sourcePath,
  };
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

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asHref(value: unknown): string | null {
  const href = asString(value);
  if (!href) {
    return null;
  }

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("data:") ||
    href.startsWith("blob:")
  ) {
    return href;
  }

  return href.startsWith("/") ? href : `/${href}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
