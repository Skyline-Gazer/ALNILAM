import { defineConfig } from "astro/config";
import svelte, {vitePreprocess} from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import shirones from "../../themes/shirone/upstream/src/integration/index.ts";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {userConfigOverrides, userConfigSources, siteAppearance} from '../../themes/shirone/adapter/site-config.mjs';
import { loadSite } from "./src/lib/site-source.mjs";
const { root: siteRoot, config } = loadSite();
process.env.ALNILAM_SITE_DIR ||= siteRoot;

const originalRename = fs.promises.rename.bind(fs.promises);
fs.promises.rename = async (oldPath, newPath) => {
  try {
    return await originalRename(oldPath, newPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EXDEV") {
      await fs.promises.cp(oldPath, newPath, { recursive: true });
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
  ],
  // compose.mjs relocates Vite's dependency cache into the managed, Core-
  // revision-keyed build cache; stale optimized deps once served broken
  // builds. Unset (direct `pnpm dev`) keeps Vite's default location.
  vite: {
    // Publish only resolved values to Shirone's shared config module. Its browser
    // consumers must never import ALNILAM's Node-only YAML/filesystem loader.
    plugins: [{
      name: 'alnilam-shirone-site-values',
      enforce: 'pre',
      load(id) {
        if (id.split('?')[0] === fileURLToPath(new URL('../../themes/shirone/upstream/src/user/user-config.ts', import.meta.url))) {
          return `export const userConfigOverrides = ${JSON.stringify(userConfigOverrides)};\nexport const userConfigSources = ${JSON.stringify(userConfigSources)};\nexport const siteAppearance = ${JSON.stringify(siteAppearance)};`;
        }
      },
    }],
    cacheDir: process.env.ALNILAM_VITE_CACHE || undefined,
  },
});

