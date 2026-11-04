import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import fs from "node:fs";
import path from "node:path";
import { loadSite } from "./lib/site-source.mjs";
import { loadSiteTaxonomy, resolvePostCategory } from "./lib/taxonomy";

const { root, config } = loadSite();
const taxonomy = loadSiteTaxonomy(root, config);
const base = new URL(config.site.url).pathname.replace(/\/$/, "");
const seriesDir = path.join(root, "content/series");

function resolveCover(cover: string | undefined, basePath: string): string {
  if (!cover) return "";
  if (/^(?:https?:|data:|\/\/)/i.test(cover)) return cover;
  if (cover.startsWith("/")) return `${basePath}${cover}`;
  const clean = cover
    .replace(/^(?:\.\.?\/)+/, "")
    .replace(/^(?:site-)?assets\//, "");
  return `${basePath}/site-assets/${clean}`;
}

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: root + "/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(""),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cover: z.string().optional(),
    category: z.string().default(""),
    tags: z.array(z.string()).default([]),
    series: z.string().default(""),
    seriesOrder: z.number().int().optional(),
    pinned: z.boolean().default(false),
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
    image: resolveCover(data.cover, base),
    pinned: data.pinned,
    category: resolvePostCategory(data.category, taxonomy.categories),
    series: data.series.trim(),
    seriesOrder: data.seriesOrder,
    // Upstream CommentSection is disabled in favor of ALNILAM's Core Comments island.
    encrypted: false, hideHomeContent: true,
    comment: config.comments.enabled,
    prevTitle: '', prevSlug: '', nextTitle: '', nextSlug: '',
  })),
});

const seriesSchema = z
  .object({
    title: z.string().min(1),
    status: z.enum(["ongoing", "completed"]).default("ongoing"),
    defaultCategory: z.string().default(""),
  })
  .transform((data) => ({
    ...data,
    defaultCategory: resolvePostCategory(data.defaultCategory, taxonomy.categories),
  }));
const series = defineCollection({
  loader: fs.existsSync(seriesDir) ? glob({ pattern: "**/*.{md,mdx}", base: seriesDir }) : async () => [],
  schema: seriesSchema,
});

// Empty stubs only for disabled upstream modules; their field contracts are not modeled.
// Enabling one requires its own Site contract/schema before any content can be loaded.
const emptyCollection = () => defineCollection({loader: async () => [], schema: z.object({title: z.string().default('')})});
export const collections = { posts, series, moments: emptyCollection(), spec: emptyCollection() };

