const STORYBLOK_CDN_BASE = "https://api.storyblok.com/v2/cdn";

export type StoryblokVersion = "draft" | "published";

export interface StoryblokStory<TContent extends Record<string, unknown>> {
  name: string;
  slug: string;
  full_slug: string;
  first_published_at?: string;
  published_at?: string;
  content: TContent;
}

interface StoryblokStoryResponse<TContent extends Record<string, unknown>> {
  story?: StoryblokStory<TContent>;
}

interface StoryblokStoriesResponse<TContent extends Record<string, unknown>> {
  stories?: StoryblokStory<TContent>[];
}

const requestCache = new Map<string, Promise<unknown>>();

export function isStoryblokConfigured(): boolean {
  return getStoryblokToken().length > 0;
}

export function getStoryblokVersion(): StoryblokVersion {
  const configuredVersion = import.meta.env.STORYBLOK_CONTENT_VERSION;
  if (configuredVersion === "draft" || configuredVersion === "published") {
    return configuredVersion;
  }

  return import.meta.env.DEV ? "draft" : "published";
}

export async function getStoryblokStory<TContent extends Record<string, unknown>>(
  slug: string,
  params: Record<string, string> = {},
): Promise<StoryblokStory<TContent> | null> {
  const response = await fetchStoryblokJson<StoryblokStoryResponse<TContent>>(
    `stories/${slug}`,
    params,
  );

  return response?.story ?? null;
}

export async function listStoryblokStories<TContent extends Record<string, unknown>>(
  params: Record<string, string> = {},
): Promise<StoryblokStory<TContent>[]> {
  const response = await fetchStoryblokJson<StoryblokStoriesResponse<TContent>>("stories", params);
  return response?.stories ?? [];
}

async function fetchStoryblokJson<T>(
  endpointPath: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const token = getStoryblokToken();
  if (!token) {
    return null;
  }

  const url = new URL(`${STORYBLOK_CDN_BASE}/${endpointPath}`);
  url.searchParams.set("token", token);
  url.searchParams.set("version", params.version ?? getStoryblokVersion());

  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "version") {
      continue;
    }

    url.searchParams.set(key, value);
  }

  const cacheKey = url.toString();
  const cached = requestCache.get(cacheKey);
  if (cached) {
    return (await cached) as T | null;
  }

  const request = fetch(cacheKey, {
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        console.warn(
          `[storyblok] request failed (${response.status}) for ${endpointPath}. Falling back to local content.`,
        );
        return null;
      }

      return (await response.json()) as T;
    })
    .catch((error) => {
      console.warn(`[storyblok] request failed for ${endpointPath}:`, error);
      return null;
    });

  requestCache.set(cacheKey, request);
  return (await request) as T | null;
}

function getStoryblokToken(): string {
  return (import.meta.env.STORYBLOK_DELIVERY_API_TOKEN ?? "").trim();
}
