import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";

export default defineConfig({
  site: "https://simonlowes.com",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/admin"),
    }),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Simon Lowes - Musician",
        short_name: "Simon Lowes",
        description: "Discover and listen to the music of Simon Lowes",
        theme_color: "#0f0f0f",
        background_color: "#0f0f0f",
        display: "standalone",
        icons: [
          {
            src: "/favicons/fav128.ico",
            sizes: "128x128",
            type: "image/x-icon",
          },
          {
            src: "/favicons/fav256.ico",
            sizes: "256x256",
            type: "image/x-icon",
          },
        ],
      },
      workbox: {
        navigateFallback: "/404",
        navigateFallbackDenylist: [/^\/admin/],
        globPatterns: ["**/*.{css,js,html,svg,png,webp,ico}"],
        globIgnores: ["**/admin/**"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/img\.icons8\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "external-icons",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
