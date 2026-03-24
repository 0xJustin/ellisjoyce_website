/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly STORYBLOK_DELIVERY_API_TOKEN?: string;
  readonly STORYBLOK_CONTENT_VERSION?: "draft" | "published";
  readonly STORYBLOK_REGION?: "eu" | "us" | "cn" | "ap" | "ca";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
