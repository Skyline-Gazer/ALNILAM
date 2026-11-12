import { getCollection, type CollectionEntry } from "astro:content";
import { buildSeriesContexts } from "@alnilam/theme-shirone/series-utils";
import { postPath, withBase } from "./i18n.mjs";

/** Build the same ordered series context used by Shirone's article renderer. */
export async function articleSeriesContexts(posts: CollectionEntry<"posts">[], defaultLocale: string) {
  if (!posts.some((post) => post.data.series)) return new Map();
  const catalog = new Map((await getCollection("series")).map((entry) => [entry.id, entry]));
  return buildSeriesContexts({
    catalog,
    posts: posts.map((post) => ({
      slug: post.id,
      title: post.data.title,
      published: post.data.pubDate,
      series: post.data.series,
      seriesOrder: post.data.seriesOrder,
      url: withBase(postPath(post, defaultLocale) + "/"),
    })),
  });
}
