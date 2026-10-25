import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { loadSite } from "./src/lib/site-source.mjs";
const { config } = loadSite();

/**
 * Optional-module route gating: a disabled module must ship nothing — no page,
 * no 404 stub, no JS. Module pages live under src/pages/opt/ and are injected
 * via injectRoute ONLY when the Site config enables them.
 */

export default defineConfig({
  site: config.site.url,
  // Sites hosted under a sub-path (e.g. GitHub Pages /ALNILAM/) need Astro's
  // base so internal links and assets are prefixed correctly. Root-hosted
  // Sites (custom domains) get "/".
  base: new URL(config.site.url).pathname.replace(/\/$/, ""),
  output: "static",
  outDir: process.env.ALNILAM_OUTPUT_DIR || "./dist",
  integrations: [
    svelte(),
    mdx(),
    {
      name: "alnilam-module-gating",
      hooks: {
        "astro:config:setup": ({ injectRoute }) => {
          if (config.bangumi.enabled) {
            injectRoute({ pattern: "/bangumi/", entrypoint: "./src/pages/opt/bangumi.astro", prerender: true });
          }
        },
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});

