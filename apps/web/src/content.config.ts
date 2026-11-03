import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { loadSite } from "./lib/site-source.mjs";

const { root, config } = loadSite();
const base = new URL(config.site.url).pathname.replace(/\/$/, "");

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
  }).transform((data) => ({
    ...data,
    published: data.pubDate,
    updated: data.updatedDate,
    image: data.cover ? (/^https?:/.test(data.cover) ? data.cover : base + (data.cover.startsWith('/') ? data.cover : '/' + data.cover)) : '',
    pinned: false, category: '', series: '', encrypted: false, hideHomeContent: true,
    comment: config.comments.enabled,
    prevTitle: '', prevSlug: '', nextTitle: '', nextSlug: '',
  })),
});
// The upstream frontend asks for optional collections; disabled modules have no Site input.
const emptyCollection = () => defineCollection({loader: async () => [], schema: z.object({title: z.string().default('')})});
export const collections = { posts, series: emptyCollection(), moments: emptyCollection(), spec: emptyCollection() };

