import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const mediaItemSchema = z.object({
  type: z.enum(["video", "audio", "image"]),
  url: z.string(),
  title: z.string().optional(),
  alt: z.string().optional(),
  mimeType: z.string().optional(),
});

const blog = defineCollection({
  // Astro 6 removed legacy `type: "content"` collections; entries are loaded
  // via the glob loader and are keyed by `id` (the old `slug`).
  // .md for plain posts, .mdx for designed ones (components from src/components/post)
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    media: z.array(mediaItemSchema).optional(),
  }),
});

export const collections = { blog };
