import { defineConfig } from "tinacms";

// Load .env.local for Node.js builds only (not in the browser admin SPA)
if (typeof globalThis.process?.cwd === "function") {
  require("dotenv").config({ path: ".env.local" });
}

const branch =
  process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

export default defineConfig({
  branch,

  // Tina Cloud credentials (set via .env.local or CI secrets)
  clientId: process.env.TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },

  media: {
    tina: {
      mediaRoot: "blog-images",
      publicFolder: "public",
    },
  },

  schema: {
    collections: [
      {
        name: "blog",
        label: "Blog Posts",
        path: "src/content/blog",
        format: "md",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "Date",
            required: true,
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "boolean",
            name: "draft",
            label: "Draft",
          },
          {
            type: "image",
            name: "heroImage",
            label: "Hero Image",
            description: "Main image displayed at the top of the post",
          },
          {
            type: "string",
            name: "heroImageAlt",
            label: "Hero Image Alt Text",
            description: "Accessible description of the hero image",
          },
          {
            type: "object",
            name: "media",
            label: "Media",
            list: true,
            fields: [
              {
                type: "string",
                name: "type",
                label: "Type",
                required: true,
                options: [
                  { value: "video", label: "Video" },
                  { value: "audio", label: "Audio" },
                  { value: "image", label: "Image" },
                ],
              },
              {
                type: "string",
                name: "url",
                label: "URL",
                required: true,
                description: "External URL (R2, VPS, or any CDN)",
              },
              {
                type: "string",
                name: "title",
                label: "Title",
              },
              {
                type: "string",
                name: "alt",
                label: "Alt Text",
              },
              {
                type: "string",
                name: "mimeType",
                label: "MIME Type",
                description: "e.g. video/mp4, audio/mpeg, image/webp",
              },
            ],
          },
        ],
      },
    ],
  },
});
