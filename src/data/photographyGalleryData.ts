import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { photographyPhotoRecords, type PhotographyPhotoRecord } from "./photographyPhotos";
import { photographyTrips, type PhotographyTrip } from "./photographyTrips";

interface PhotographyGalleryData {
  trips: PhotographyTrip[];
  photos: PhotographyPhotoRecord[];
}

const LEGACY_IMAGE_URL_PATTERN = /https?:\/\/images\.squarespace-cdn\.com\/content\/v1\/[^"' )>]+/gi;
const IMAGE_EXTENSION_PATTERN = /\.(?:jpe?g|png|webp|avif)$/i;
const LEGACY_HTML_BASE_URL = new URL("../../site/photography/", import.meta.url);

export function getPhotographyGalleryData(): PhotographyGalleryData {
  const mergedPhotos = mergePhotosWithLegacySnapshots(photographyTrips, photographyPhotoRecords);
  return {
    trips: photographyTrips,
    photos: mergedPhotos,
  };
}

function mergePhotosWithLegacySnapshots(
  trips: PhotographyTrip[],
  basePhotos: PhotographyPhotoRecord[],
): PhotographyPhotoRecord[] {
  const merged = [...basePhotos];
  const seenSignatures = new Set(basePhotos.map((photo) => `${photo.tripSlug}|${canonicalizeImageUrl(photo.src)}`));

  trips.forEach((trip) => {
    const segment = legacyPathSegment(trip.legacyPath);
    if (!segment) {
      return;
    }

    const htmlUrl = new URL(`./${segment}/index.html`, LEGACY_HTML_BASE_URL);
    const htmlPath = fileURLToPath(htmlUrl);
    if (!existsSync(htmlPath)) {
      return;
    }

    const html = readFileSync(htmlPath, "utf-8");
    const legacySources = extractLegacyImageSources(html);
    let importedCount = 0;

    legacySources.forEach((source) => {
      const signature = `${trip.slug}|${source}`;
      if (seenSignatures.has(signature)) {
        return;
      }
      seenSignatures.add(signature);
      importedCount += 1;
      merged.push({
        id: `${trip.slug}-legacy-${String(importedCount).padStart(3, "0")}`,
        tripSlug: trip.slug,
        src: source,
        alt: `${trip.title} photograph`,
        rating: 0,
        tags: ["trip-import"],
      });
    });
  });

  return merged;
}

function extractLegacyImageSources(html: string): string[] {
  const unique = new Set<string>();
  const matches = html.match(LEGACY_IMAGE_URL_PATTERN) ?? [];
  matches.forEach((raw) => {
    const canonical = canonicalizeImageUrl(raw);
    if (!canonical) {
      return;
    }
    unique.add(canonical);
  });
  return Array.from(unique);
}

function canonicalizeImageUrl(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    const normalizedPath = decodeURIComponent(url.pathname);
    if (!IMAGE_EXTENSION_PATTERN.test(normalizedPath)) {
      return "";
    }
    return `${url.origin}${url.pathname}`;
  } catch (_error) {
    return "";
  }
}

function legacyPathSegment(pathValue: string): string {
  const normalized = String(pathValue || "")
    .split("?")[0]
    .split("#")[0]
    .trim()
    .replace(/\/+$/g, "");
  if (!normalized.startsWith("/photography/")) {
    return "";
  }

  const segments = normalized.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last === "photography") {
    return "";
  }

  return last;
}
