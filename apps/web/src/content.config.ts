import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { join } from "node:path";
import { loadSite } from "./lib/site-source.mjs";

const { root } = loadSite();

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: join(root, "content/posts") }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
export const collections = { posts };

