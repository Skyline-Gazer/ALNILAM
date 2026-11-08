import { defineConfig } from "astro/config";
import svelte, {vitePreprocess} from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import shirones from "../../themes/shirone/upstream/src/integration/index.ts";
import {createExpressiveCodeIntegration} from "../../themes/shirone/adapter/expressive-code.ts";
import {createSeoInventory} from "./seo-inventory.mjs";
import {sitemapCompat} from "./sitemap-compat.mjs";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {userConfigOverrides, userConfigSources, siteAppearance, siteLocales} from '../../themes/shirone/adapter/site-config.mjs';
import {readBangumiSnapshot, materializeBangumiCovers, bangumiCoversDir, isBangumiCoverAssetName, bangumiCoverContentType, BANGUMI_COVER_URL_PREFIX} from "./src/lib/bangumi.mjs";
import { loadSite } from "./src/lib/site-source.mjs";
const { root: siteRoot, config } = loadSite();
process.env.ALNILAM_SITE_DIR ||= siteRoot;

const buildScratchRoot = fileURLToPath(new URL("./.astro", import.meta.url));
const userConfigTarget = fs.realpathSync(
  fileURLToPath(new URL("../../themes/shirone/upstream/src/user/user-config.ts", import.meta.url)),
);
const toPathString = (target) => (target instanceof URL ? fileURLToPath(target) : String(target));
const originalRename = fs.promises.rename.bind(fs.promises);
// Astro 7.4.2 ssrMoveAssets moves prerendered assets from apps/web/.astro into outDir via rename();
// when outDir is on a separate mount (e.g. /tmp tmpfs), fall back to copy+remove strictly for .astro scratch.
fs.promises.rename = async (oldPath, newPath) => {
  try {
    return await originalRename(oldPath, newPath);
  } catch (error) {
    const oldFile = path.resolve(toPathString(oldPath));
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EXDEV" &&
      oldFile.startsWith(buildScratchRoot + path.sep)
    ) {
      await fs.promises.cp(oldPath, newPath, { recursive: true, force: true });
      await fs.promises.rm(oldPath, { recursive: true, force: true });
      return;
    }
    throw error;
  }
};

/**
 * Optional-module route gating: a disabled module must ship nothing — no page,
 * no 404 stub, no JS. Module pages live under src/modules/ and are injected
 * via injectRoute ONLY when the Site config enables them.
 */

const base = new URL(config.site.url).pathname.replace(/\/$/, "") || "/";
// Reads the emitted HTML during astro:build:done; register it before the
// sitemap integration so the sitemap sees the same canonical/hreflang facts.
const seoInventory = createSeoInventory({ base });
const shironeCacheDir =
  process.env.ALNILAM_SHIRONE_CACHE ||
  (process.env.ALNILAM_ASTRO_CACHE
    ? path.join(path.dirname(process.env.ALNILAM_ASTRO_CACHE), "shirone")
    : fileURLToPath(new URL("../../.tmp/shirone", import.meta.url)));

export default defineConfig({
  site: config.site.url,
  // Sites hosted under a sub-path (e.g. GitHub Pages /ALNILAM/) need Astro's
  // base so internal links and assets are prefixed correctly. Root-hosted
  // Sites (custom domains) get "/".
  base,
  // Site config owns the locale set and the default-locale prefix policy;
  // astro:i18n helpers compose /<locale>/ paths against `site` and `base`.
  i18n: {
    defaultLocale: config.site.locale,
    locales: [...config.locales],
    routing: {
      prefixDefaultLocale: config.routing.prefixDefaultLocale,
    },
  },
  output: "static",
  outDir: process.env.ALNILAM_OUTPUT_DIR || "./dist",
  build: {
    inlineStylesheets: "never",
  },
  // compose.mjs points this at the managed build cache (per Core revision and
  // Site digest). Astro's build-time content store and image cache live here;
  // shared default locations once served stale entries across builds. Unset
  // (direct `pnpm dev`) keeps Astro's default location.
  cacheDir: process.env.ALNILAM_ASTRO_CACHE || undefined,
  integrations: [
    seoInventory,
    shirones({
      bundledIntegrations: false,
      injectRoutes: false,
      pagefind: false,
      fonts: {subset: false},
      paths: {
        root: shironeCacheDir,
        cache: shironeCacheDir,
        config: fileURLToPath(new URL('../../themes/shirone/upstream/src/config', import.meta.url)),
        data: fileURLToPath(new URL('../../themes/shirone/upstream/src/data', import.meta.url)),
        content: siteRoot + '/content',
      },
    }),
    // Expressive Code must precede MDX and follow the theme's Markdown processor.
    createExpressiveCodeIntegration(),
    // Svelte 5 strips type-only TS; Vite preprocessing is needed only for native Stylus.
    svelte({preprocess: [vitePreprocess()]}),
    mdx(),
    {
      name: "alnilam-module-gating",
      hooks: {
        "astro:config:setup": ({ injectRoute }) => {
          if (config.bangumi.enabled) {
            injectRoute({ pattern: "/bangumi/", entrypoint: "./src/modules/bangumi.astro", prerender: true });
          }
          if (config.llms.enabled) {
            injectRoute({ pattern: "/llms.txt", entrypoint: "./src/modules/llms.txt.js", prerender: true });
            if (config.llms.full) injectRoute({ pattern: "/llms-full.txt", entrypoint: "./src/modules/llms-full.txt.js", prerender: true });
          }
          if (fs.existsSync(path.join(siteRoot, "content/series"))) {
            injectRoute({ pattern: "/series/", entrypoint: "./src/modules/series.astro", prerender: true });
            injectRoute({ pattern: "/series/[slug]/", entrypoint: "./src/modules/series-detail.astro", prerender: true });
          }
        },
        "astro:build:setup": ({ vite }) => {
          if (process.env.ALNILAM_ASTRO_CACHE && vite.environments) {
            const buildScratch = fileURLToPath(new URL(`./.astro/build-${process.pid}`, import.meta.url));
            if (vite.environments.prerender?.build) {
              vite.environments.prerender.build.outDir = path.join(buildScratch, ".prerender");
            }
            if (vite.environments.ssr?.build) {
              vite.environments.ssr.build.outDir = buildScratch;
            }
            const cleanScratch = () => {
              try {
                fs.rmSync(buildScratch, { recursive: true, force: true });
                const dotAstro = path.dirname(buildScratch);
                if (fs.existsSync(dotAstro) && fs.readdirSync(dotAstro).length === 0) {
                  fs.rmdirSync(dotAstro);
                }
              } catch {}
            };
            process.once("exit", cleanScratch);
          }
        },
      },
    },
    // Official sitemap: URL collection, chunking and XML escaping. Inclusion,
    // lastmod and hreflang links come from the real emitted HTML above.
    sitemap({
      filter: (url) => seoInventory.filter(url),
      serialize: (item) => seoInventory.serialize(item),
    }),
    // Older consumers read a single /sitemap.xml; mirror the official entries.
    sitemapCompat(),
    // Covers are downloaded into the managed cache by the build-time provider.
    // Copy those files into the finished output (Astro may clear/replace it
    // during the build) and serve the same cache entries in dev.
    ...(config.bangumi.enabled ? [{
      name: "alnilam-bangumi-covers",
      hooks: {
        "astro:build:done": ({dir}) => {
          const assetStage = process.env.ALNILAM_BANGUMI_ASSET_STAGE;
          if (assetStage) {
            const covers = path.join(assetStage, "bangumi-covers");
            if (fs.existsSync(covers)) {
              fs.cpSync(covers, path.join(fileURLToPath(dir), "bangumi-covers"), {recursive: true});
            }
          } else {
            materializeBangumiCovers(fileURLToPath(dir), readBangumiSnapshot(config.bangumi));
          }
        },
        "astro:server:setup": ({server}) => {
          const prefix = BANGUMI_COVER_URL_PREFIX;
          server.middlewares.use((req, res, next) => {
            let pathname;
            try {
              pathname = new URL(req.url ?? "/", "http://localhost").pathname;
            } catch {
              return next();
            }
            if (!pathname.startsWith(prefix)) return next();
            const name = pathname.slice(prefix.length);
            if (!isBangumiCoverAssetName(name)) return next();
            const file = path.join(bangumiCoversDir(), name);
            if (!fs.existsSync(file)) return next();
            res.setHeader("Content-Type", bangumiCoverContentType(name));
            fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
          });
        },
      },
    }] : []),
  ],
  // compose.mjs relocates Vite's dependency cache into the managed, Core-
  // revision-keyed build cache; stale optimized deps once served broken
  // builds. Unset (direct `pnpm dev`) keeps Vite's default location.
  vite: {
    // Publish only resolved values to Shirone's shared config module. Its browser
    // consumers must never import ALNILAM's Node-only YAML/filesystem loader.
    plugins: [
      {
        name: 'alnilam-comments-entry',
        resolveId: (id) => id === 'virtual:alnilam-comments' ? '\0alnilam-comments' : undefined,
        load(id) {
          if (id !== '\0alnilam-comments') return;
          return config.comments.enabled
            ? `export { default } from ${JSON.stringify(fileURLToPath(new URL('./src/components/Comments.astro', import.meta.url)))};`
            : 'export default null;';
        },
      },
      {
        name: 'alnilam-shirone-site-values',
        enforce: 'pre',
        load(id) {
          const clean = id.split('?')[0];
          if (!clean || !path.isAbsolute(clean)) return;
          try {
            if (fs.realpathSync(clean) === userConfigTarget) {
              return `export const userConfigOverrides = ${JSON.stringify(userConfigOverrides)};\nexport const userConfigSources = ${JSON.stringify(userConfigSources)};\nexport const siteAppearance = ${JSON.stringify(siteAppearance)};\nexport const siteLocales = ${JSON.stringify(siteLocales)};`;
            }
          } catch {
            return;
          }
        },
      },
      {
        // Side-effect module: registers the Site tag-catalog slug resolver so
        // theme components emit canonical tag URLs without importing the
        // Node-only Site loader.
        name: 'alnilam-tag-resolver',
        enforce: 'pre',
        resolveId: (id) => (id === 'alnilam-tag-resolver' ? '\0alnilam-tag-resolver' : undefined),
        load(id) {
          if (id !== '\0alnilam-tag-resolver') return;
          return [
            `import { loadSite } from ${JSON.stringify(fileURLToPath(new URL("./src/lib/site-source.mjs", import.meta.url)))};`,
            `import { loadSiteTaxonomy, canonicalTagSlug } from ${JSON.stringify(fileURLToPath(new URL("./src/lib/taxonomy.ts", import.meta.url)))};`,
            `import { setTagSlugResolver } from ${JSON.stringify(fileURLToPath(new URL("../../themes/shirone/upstream/src/utils/url-utils.ts", import.meta.url)))};`,
            `const { root, config } = loadSite();`,
            `const taxonomy = loadSiteTaxonomy(root, config);`,
            `setTagSlugResolver((tag) => canonicalTagSlug(tag, taxonomy.tags));`,
          ].join("\n");
        },
      },
    ],
    cacheDir: process.env.ALNILAM_VITE_CACHE || undefined,
  },
});

