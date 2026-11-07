import { canonicalUrl, postLang, postPath } from "./i18n.mjs";
import { markdownView } from "./llms-markdown.mjs";

export function llmsPosts(posts, config) {
  return posts.filter((post) => !post.data.draft && config.locales.includes(postLang(post, config.site.locale)))
    .sort((a, b) => postPath(a, config.site.locale).localeCompare(postPath(b, config.site.locale), "en"));
}
export function localeHasPosts(posts, locale, config) {
  return posts.some((post) => postLang(post, config.site.locale) === locale);
}


export function markdownPath(post, config) {
  return `${postPath(post, config.site.locale)}/index.md`;
}

export function llmsIndexPath(locale, config) {
  return locale === config.site.locale ? "/llms.txt" : `/${locale}/llms.txt`;
}

export function deploymentBase(config) {
  return new URL(config.site.url).pathname.replace(/\/+$/, "") || "/";
}

export function absolute(path, config) {
  return canonicalUrl(path, config.site.url, deploymentBase(config));
}

export function indexText(posts, config, locale) {
  const selected = locale ? posts.filter((post) => postLang(post, config.site.locale) === locale) : posts;
  const lines = [`# ${config.site.title}`, "", `> ${config.site.description || config.site.title}`, "", "## Articles", ""];
  for (const post of selected) {
    const description = post.data.description ? `: ${post.data.description.replace(/\s+/g, " ")}` : "";
    lines.push(`- [${post.data.title.replace(/[\[\]]/g, "\\$&")}](${absolute(markdownPath(post, config), config)})${description}`);
  }
  if (!locale) {
    const locales = config.locales.filter((lang) => lang !== config.site.locale && localeHasPosts(posts, lang, config));
    if (locales.length) {
      lines.push("", "## Languages", "");
      for (const lang of locales) lines.push(`- [${lang}](${absolute(llmsIndexPath(lang, config), config)})`);
    }
    if (config.llms.full) lines.push("", "## Optional", "", `- [Full text](${absolute("/llms-full.txt", config)})`);
  }
  return lines.join("\n") + "\n";
}

export function fullText(posts, root, config, htmlRoutes) {
  return posts.map((post) => markdownView(post, posts, root, config, htmlRoutes)).join("\n\n---\n\n");
}

// Astro renders endpoints before all HTML exists. The build-done inventory
// replaces this temporary payload with the final Markdown after prerendering.
const markdownStage = "alnilam:pending-markdown\n";
export function stageMarkdown(payload) {
  return markdownStage + JSON.stringify(payload);
}

export function finishMarkdown(text, htmlRoutes) {
  if (!text.startsWith(markdownStage)) return null;
  const { post, posts, root, config } = JSON.parse(text.slice(markdownStage.length));
  return post ? markdownView(post, posts, root, config, htmlRoutes) : fullText(posts, root, config, htmlRoutes);
}
