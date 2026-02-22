import { defineCollection, z } from "astro:content";

const mediaItemSchema = z.object({
  type: z.enum(["video", "audio", "image"]),
  url: z.string(),
  title: z.string().optional(),
  alt: z.string().optional(),
  mimeType: z.string().optional(),
});

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string().optional(),
    draft: z.boolean().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    media: z.array(mediaItemSchema).optional(),
  }),
});

export const collections = { blog };
