import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { loadSite } from "./lib/site-source.mjs";

const { root } = loadSite();

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: root + "/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // i18n (schema v1 additive): `lang` is BCP-47, defaults to the site locale.
    // `translationKey` groups translations of the same article; when present on
    // any post, hreflang alternates are rendered for the whole group.
    lang: z.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/, "must be a BCP-47 tag").optional(),
    translationKey: z.string().min(1).optional(),
  }),
});
export const collections = { posts };

