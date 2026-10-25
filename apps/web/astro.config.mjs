import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { loadSite } from "./src/lib/site-source.mjs";
const { config } = loadSite();
export default defineConfig({
  site: config.site.url,
  output: "static",
  outDir: process.env.ALNILAM_OUTPUT_DIR || "./dist",
  integrations: [svelte(), mdx()],
  vite: { plugins: [tailwindcss()] },
});

