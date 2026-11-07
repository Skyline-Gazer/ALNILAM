import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { canonicalUrl, postLang, postPath } from "./i18n.mjs";

/** Render a public, source-backed Markdown representation of a post. */
export function markdownView(post, posts, root, config, htmlRoutes = null) {
  const base = new URL(config.site.url).pathname.replace(/\/+$/, "");
  const absolute = (url) => canonicalUrl(url, config.site.url, base);
  const article = absolute(postPath(post, config.site.locale) + "/");
  const postsDir = path.resolve(root, "content/posts");
  // Astro stores filePath relative to its project root, not the Site root.
  const sourceDir = path.dirname(path.join(postsDir, post.id));
  const assetsDir = path.resolve(root, "assets");
  const publicPosts = new Map(posts
    .filter((entry) => !entry.data.draft && config.locales.includes(postLang(entry, config.site.locale)))
    .map((entry) => [entry.id.replace(/\\/g, "/"), entry]));
  const isPublished = (entry) => !htmlRoutes || htmlRoutes.has(postPath(entry, config.site.locale));

  function destination(value, image = false) {
    const target = value.trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|tel:)/i.test(target)) return target;
    if (/^\/\//.test(target)) return new URL(target, config.site.url).toString();
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) return "";
    if (/^[?#]/.test(target)) return new URL(target, article).toString();
    const match = /^([^?#]*)([?#].*)?$/.exec(target);
    const pathname = match[1];
    const suffix = match[2] || "";
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { return ""; }
    if (decoded.startsWith("/")) {
      const normalized = base && (decoded === base || decoded.startsWith(base + "/"))
        ? decoded.slice(base.length) || "/" : decoded;
      if (normalized.split(/[\\/]/).some((part) => part === "..")) return "";
      const route = normalized.replace(/\/$/, "");
      const published = [...publicPosts.values()].find((entry) => postPath(entry, config.site.locale) === route);
      if (published && isPublished(published)) return absolute(postPath(published, config.site.locale) + "/") + suffix;
      if (htmlRoutes?.has(route || "/")) {
        const encoded = (route || "/").split("/").map(encodeURIComponent).join("/");
        return absolute(encoded === "/" || /\.html$/.test(encoded) ? encoded : encoded + "/") + suffix;
      }
      if (!/^\/content\/posts\//.test(normalized)) {
        const asset = /^\/(?:site-)?assets\/(.+)$/.exec(normalized);
        if (!asset) return "";
        const assetPath = path.resolve(assetsDir, asset[1]);
        try {
          const realAssets = fs.realpathSync(assetsDir);
          const realAsset = fs.realpathSync(assetPath);
          if (!realAsset.startsWith(realAssets + path.sep) || !fs.statSync(realAsset).isFile()) return "";
          return absolute("/site-assets/" + asset[1].split("/").map(encodeURIComponent).join("/")) + suffix;
        } catch { return ""; }
      }
      decoded = normalized;
    }
    const source = decoded.startsWith("/")
      ? path.resolve(postsDir, decoded.slice("/content/posts/".length))
      : path.resolve(sourceDir, decoded);
    const id = path.relative(postsDir, source).replace(/\\/g, "/").replace(/\.mdx?$/i, "").replace(/\/$/, "");
    const entry = publicPosts.get(id) || publicPosts.get(id + "/index");
    if (entry && isPublished(entry)) return absolute(postPath(entry, config.site.locale) + "/") + suffix;
    if (/\.mdx?$/i.test(decoded)) return "";
    if (decoded.startsWith("/")) return "";
    const relative = path.relative(assetsDir, source);
    if (relative && !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative)) {
      if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return "";
      return absolute("/site-assets/" + relative.split(path.sep).map(encodeURIComponent).join("/")) + suffix;
    }
    if (!image || !/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(decoded)) return "";
    try {
      const realSource = fs.realpathSync(source);
      const realPosts = fs.realpathSync(postsDir);
      if (!realSource.startsWith(realPosts + path.sep) || !fs.statSync(realSource).isFile()) return "";
      const parsed = path.parse(source);
      const hash = crypto.createHash("sha256").update(fs.readFileSync(realSource)).digest("hex").slice(0, 8);
      return absolute("/_astro/" + encodeURIComponent(`${parsed.name}.${hash}${parsed.ext}`)) + suffix;
    } catch { return ""; }
  }

  // The collection body is usually already stripped, but full source is also accepted.
  const body = String(post.body || "").replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/, "");
  const isMdx = /\.mdx$/i.test(post.filePath || "") || /^(?:import|export)\s/m.test(body) || /<[A-Z][\w.]*(?:\s|\/?>)/.test(body);
  const parser = unified().use(remarkParse).use(remarkMath);
  if (isMdx) parser.use(remarkMdx);
  const tree = parser.parse(body);
  const edits = [];
  const replace = (start, end, value) => edits.push({ start, end, value });

  function visit(node) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start == null || end == null) return;
    if (["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"].includes(node.type)) {
      replace(start, end, "");
      return;
    }
    if (["link", "image", "definition"].includes(node.type)) {
      const url = destination(node.url, node.type === "image" || node.type === "definition");
      const source = body.slice(start, end);
      if (!url) {
        if (node.type === "link") {
          const first = node.children?.[0]?.position?.start.offset;
          const last = node.children?.at(-1)?.position?.end.offset;
          replace(start, end, first == null ? "" : body.slice(first, last));
        } else replace(start, end, node.type === "image" ? node.alt || "" : "");
        return;
      }
      // Use the parsed node boundaries, preserving labels, titles and formatting.
      const prefix = node.type === "definition" ? /^\[[^\]]+\]:\s*/ : /^[\s\S]*?\]\(\s*/;
      const found = prefix.exec(source);
      if (found) {
        const pos = start + found[0].length;
        const raw = /^(?:<[^>]*>|(?:\\.|[^\s()]|\([^()]*\))+)/.exec(body.slice(pos, end));
        if (raw) replace(pos, pos + raw[0].length, url);
      }
    }
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      const attrs = Object.fromEntries((node.attributes || [])
        .filter((attr) => attr.type === "mdxJsxAttribute" && typeof attr.value === "string")
        .map((attr) => [attr.name, attr.value]));
      const url = destination(attrs.href || attrs.url || attrs.src || "", Boolean(attrs.src));
      const label = attrs.alt || attrs.title || attrs.label || node.name || "Component";
      const first = node.children?.[0]?.position?.start.offset;
      const last = node.children?.at(-1)?.position?.end.offset;
      if (first == null) {
        const value = attrs.src && url ? `![${label}](${url})`
          : (attrs.href || attrs.url) && url ? `[${label}](${url})` : `[${node.name || "Component"}: ${label}]`;
        replace(start, end, value);
        return;
      }
      const link = (attrs.href || attrs.url) && url;
      replace(start, first, link ? "[" : "");
      replace(last, end, link ? `](${url})` : "");
    }
    if (node.type === "html") {
      const source = body.slice(start, end);
      const clean = source.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?([A-Za-z][\w.-]*)\b([^<>]*?)\s*\/?>/g, (tag, name, raw) => {
        if (tag.startsWith("</")) return name.toLowerCase() === "a" ? "</a>" : "";
        const attr = (key) => new RegExp(`\\b${key}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(raw)?.[2] || "";
        const src = attr("src");
        const href = attr("href");
        const label = attr("alt") || attr("title");
        const url = destination(src || href, Boolean(src));
        if (src && url) return `![${label}](${url})`;
        if (href && url) return `<a href="${url.replace(/"/g, "%22")}">`;
        return label;
      });
      replace(start, end, clean);
      return;
    }
    for (const child of node.children || []) visit(child);
  }
  visit(tree);
  let converted = body;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    converted = converted.slice(0, edit.start) + edit.value + converted.slice(edit.end);
  }
  return `# ${post.data.title}\n\n${converted.trim()}\n`;
}
