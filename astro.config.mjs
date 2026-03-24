import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { storyblok } from "@storyblok/astro";

const storyblokToken = process.env.STORYBLOK_DELIVERY_API_TOKEN?.trim();
const storyblokRegion = process.env.STORYBLOK_REGION?.trim();

const storyblokIntegration = storyblokToken
  ? storyblok({
      accessToken: storyblokToken,
      apiOptions: {
        ...(storyblokRegion ? { region: storyblokRegion } : {}),
      },
      bridge: true,
      livePreview: true,
    })
  : null;

export default defineConfig({
  site: "https://www.ellis-joyce.com",
  integrations: storyblokIntegration ? [sitemap(), storyblokIntegration] : [sitemap()],
  output: "static",
});
