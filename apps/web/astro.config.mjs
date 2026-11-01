import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { loadSite } from "./src/lib/site-source.mjs";
const { config } = loadSite();

/**
 * Optional-module route gating: a disabled module must ship nothing — no page,
 * no 404 stub, no JS. Module pages live under src/modules/ and are injected
 * via injectRoute ONLY when the Site config enables them.
 */

const base = new URL(config.site.url).pathname.replace(/\/$/, "") || "/";

export default defineConfig({
  site: config.site.url,
  // Sites hosted under a sub-path (e.g. GitHub Pages /ALNILAM/) need Astro's
  // base so internal links and assets are prefixed correctly. Root-hosted
  // Sites (custom domains) get "/".
  base,
  output: "static",
  outDir: process.env.ALNILAM_OUTPUT_DIR || "./dist",
  // compose.mjs points this at the managed build cache (per Core revision and
  // Site digest). Astro's build-time content store and image cache live here;
  // shared default locations once served stale entries across builds. Unset
  // (direct `pnpm dev`) keeps Astro's default location.
  cacheDir: process.env.ALNILAM_ASTRO_CACHE || undefined,
  integrations: [
    svelte(),
    mdx(),
    {
      name: "alnilam-module-gating",
      hooks: {
        "astro:config:setup": ({ injectRoute }) => {
          if (config.bangumi.enabled) {
            injectRoute({ pattern: "/bangumi/", entrypoint: "./src/modules/bangumi.astro", prerender: true });
          }
        },
      },
    },
  ],
  // compose.mjs relocates Vite's dependency cache into the managed, Core-
  // revision-keyed build cache; stale optimized deps once served broken
  // builds. Unset (direct `pnpm dev`) keeps Vite's default location.
  vite: {
    cacheDir: process.env.ALNILAM_VITE_CACHE || undefined,
    plugins: [tailwindcss()],
  },
});

