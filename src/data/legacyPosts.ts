import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type LegacyPostBlock =
  | {
      type: "html";
      html: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
    };

export interface LegacyPost {
  slug: string;
  title: string;
  section: "Science" | "Monthly";
  sourcePath: string;
  legacyPath: string;
  publishedAt: string;
  publishedLabel: string;
  excerpt: string;
  coverImage: string | null;
  blocks: LegacyPostBlock[];
}

interface LegacyPostSource {
  slug: string;
  section: "Science" | "Monthly";
  sourcePath: string;
  legacyPath: string;
}

const LEGACY_POST_SOURCES: LegacyPostSource[] = [
  {
    slug: "flywire-feedback",
    section: "Science",
    sourcePath: "public/ellis-joyce/flywire-feedback/index.html",
    legacyPath: "/ellis-joyce/flywire-feedback",
  },
  {
    slug: "animals-evidence",
    section: "Science",
    sourcePath: "public/ellis-joyce/animals-evidence/index.html",
    legacyPath: "/ellis-joyce/animals-evidence",
  },
  {
    slug: "gwenjustin-november",
    section: "Monthly",
    sourcePath: "public/ellisjoycemonthly/gwenjustin-november/index.html",
    legacyPath: "/ellisjoycemonthly/gwenjustin-november",
  },
  {
    slug: "justin-gwen-december",
    section: "Monthly",
    sourcePath: "public/ellisjoycemonthly/justin-gwen-december/index.html",
    legacyPath: "/ellisjoycemonthly/justin-gwen-december",
  },
  {
    slug: "gwen-justin-jan-and-feb",
    section: "Monthly",
    sourcePath: "public/ellisjoycemonthly/gwen-justin-jan-and-feb/index.html",
    legacyPath: "/ellisjoycemonthly/gwen-justin-jan-and-feb",
  },
];

let cachedPosts: LegacyPost[] | null = null;

export function getLegacyPosts(): LegacyPost[] {
  if (cachedPosts) {
    return cachedPosts;
  }

  const parsed = LEGACY_POST_SOURCES.map(parseLegacyPost).sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  cachedPosts = parsed;
  return parsed;
}

export function getLegacyPostBySlug(slug: string): LegacyPost | undefined {
  return getLegacyPosts().find((post) => post.slug === slug);
}

function parseLegacyPost(source: LegacyPostSource): LegacyPost {
  const absolutePath = resolve(process.cwd(), source.sourcePath);
  const raw = readFileSync(absolutePath, "utf-8");

  const title = extractTitle(raw) ?? source.slug;
  const publishedAt = extractMetaValue(raw, "datePublished");
  const publishedLabel = formatPublishedDate(publishedAt);

  const articleMarkup = extractArticleBody(raw);
  const blocks = extractArticleBlocks(articleMarkup, title);
  const coverImage = blocks.find((block) => block.type === "image")?.src ?? null;
  const excerpt = buildExcerpt(blocks);

  return {
    slug: source.slug,
    title,
    section: source.section,
    sourcePath: source.sourcePath,
    legacyPath: source.legacyPath,
    publishedAt,
    publishedLabel,
    excerpt,
    coverImage,
    blocks,
  };
}

function extractTitle(html: string): string | null {
  const headlineMatch = html.match(
    /<h1[^>]*class="entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (headlineMatch) {
    return decodeEntities(stripTags(headlineMatch[1]).trim());
  }

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    return null;
  }

  const title = decodeEntities(stripTags(titleMatch[1])).trim();
  return title.replace(/\s+-\s+Gwendolyn and Justin Ellis-Joyce$/i, "").trim();
}

function extractMetaValue(html: string, itemProp: string): string {
  const pattern = new RegExp(
    `<meta[^>]*itemprop=["']${itemProp}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ?? "";
}

function formatPublishedDate(dateIso: string): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.valueOf())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function extractArticleBody(html: string): string {
  const marker = 'class="blog-item-content e-content"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return "";
  }

  const divStart = html.lastIndexOf("<div", markerIndex);
  if (divStart < 0) {
    return "";
  }

  const extracted = extractDivInnerFromIndex(html, divStart);
  return extracted.inner;
}

function extractArticleBlocks(articleMarkup: string, title: string): LegacyPostBlock[] {
  const blocks: LegacyPostBlock[] = [];
  let cursor = 0;

  while (cursor < articleMarkup.length) {
    const nextText = articleMarkup.indexOf('<div class="sqs-html-content"', cursor);
    const nextImage = articleMarkup.indexOf("<img ", cursor);
    const nextIndex = pickNextIndex(nextText, nextImage);

    if (nextIndex < 0) {
      break;
    }

    if (nextIndex === nextText) {
      const extracted = extractDivInnerFromIndex(articleMarkup, nextText);
      const cleaned = sanitizeRichHtml(extracted.inner);
      if (isMeaningfulHtml(cleaned)) {
        blocks.push({
          type: "html",
          html: cleaned,
        });
      }
      cursor = extracted.endIndex;
      continue;
    }

    const tagEnd = articleMarkup.indexOf(">", nextImage);
    if (tagEnd < 0) {
      break;
    }

    const imageTag = articleMarkup.slice(nextImage, tagEnd + 1);
    const rawSrc = readAttribute(imageTag, "src") ?? readAttribute(imageTag, "data-src");
    const rawAlt = readAttribute(imageTag, "alt") ?? "";
    const src = normalizeSrc(rawSrc ?? "");

    if (src && !src.includes("memberAccountAvatars")) {
      blocks.push({
        type: "image",
        src,
        alt: decodeEntities(rawAlt) || `${title} image`,
      });
    }

    cursor = tagEnd + 1;
  }

  return blocks;
}

function pickNextIndex(a: number, b: number): number {
  if (a < 0 && b < 0) return -1;
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

function extractDivInnerFromIndex(html: string, divStartIndex: number): {
  inner: string;
  endIndex: number;
} {
  const tagClose = html.indexOf(">", divStartIndex);
  if (tagClose < 0) {
    return { inner: "", endIndex: html.length };
  }

  let depth = 1;
  const tokenPattern = /<div\b[^>]*>|<\/div>/gi;
  tokenPattern.lastIndex = tagClose + 1;

  let endIndex = html.length;
  let token: RegExpExecArray | null = null;
  while ((token = tokenPattern.exec(html)) !== null) {
    if (token[0][1] === "/") {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      endIndex = token.index;
      break;
    }
  }

  return {
    inner: html.slice(tagClose + 1, endIndex),
    endIndex: tokenPattern.lastIndex,
  };
}

function sanitizeRichHtml(html: string): string {
  let clean = html;

  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<\/?span[^>]*>/gi, "");
  clean = clean.replace(/<\/?div[^>]*>/gi, "");
  clean = clean.replace(
    /\s(?:class|style|id|role|aria-[\w:-]+|data-[\w:-]+)=["'][^"']*["']/gi,
    "",
  );
  clean = clean.replace(/&nbsp;/gi, " ");
  clean = clean.replace(/<p>\s*<\/p>/gi, "");
  clean = clean.replace(/<h[1-6]>\s*<\/h[1-6]>/gi, "");
  clean = clean.replace(/\s{2,}/g, " ");
  clean = clean.trim();

  return clean;
}

function isMeaningfulHtml(html: string): boolean {
  if (!html.trim()) return false;
  const text = stripTags(html).replace(/\s+/g, " ").trim();
  return text.length > 0;
}

function buildExcerpt(blocks: LegacyPostBlock[]): string {
  const combined = blocks
    .filter((block): block is Extract<LegacyPostBlock, { type: "html" }> => block.type === "html")
    .map((block) => stripTags(block.html))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!combined) {
    return "Legacy post migrated from Squarespace.";
  }

  const limit = 220;
  if (combined.length <= limit) {
    return combined;
  }

  return `${combined.slice(0, limit).trim()}...`;
}

function readAttribute(tag: string, attributeName: string): string | null {
  const pattern = new RegExp(`${attributeName}="([^"]*)"`, "i");
  const match = tag.match(pattern);
  return match?.[1] ?? null;
}

function normalizeSrc(src: string): string {
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  return src;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2019;/gi, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8230;/g, "...");
}

