import expressiveCode, { createAstroRenderer } from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { expressiveCodeConfig } from "../upstream/src/config/expressiveCodeConfig.ts";
import { expressiveCodeShared } from "../upstream/src/config/integrationsConfig.ts";
import { pluginLanguageBadge } from "../upstream/src/plugins/expressive-code/language-badge.ts";
import { pluginCustomCopyButton } from "../upstream/src/plugins/expressive-code/custom-copy-button.ts";

export function createExpressiveCodeIntegration() {
	let runtime: string | undefined;
	const integration = expressiveCode({
		themes: [
			expressiveCodeConfig.lightTheme ?? expressiveCodeConfig.theme,
			expressiveCodeConfig.darkTheme ?? expressiveCodeConfig.theme,
		] as never,
		plugins: [
			pluginCollapsibleSections(),
			pluginLineNumbers(),
			pluginLanguageBadge(),
			pluginCustomCopyButton(),
		] as never,
		...expressiveCodeShared,
		async customCreateAstroRenderer(args) {
			const renderer = await createAstroRenderer(args);
			// Keep the exact modules supplied by Expressive Code and its plugins, but
			// bundle them with Markdown instead of emitting another page script.
			runtime = renderer.hashedScripts.map(([, source]) => source).join("\n");
			renderer.hashedScripts.length = 0;
			return renderer;
		},
	});
	const setup = integration.hooks["astro:config:setup"];
	integration.hooks["astro:config:setup"] = async (args) => {
		await setup(args);
		args.updateConfig({ vite: { plugins: [{
			name: "expressive-code-markdown-runtime",
			resolveId(id) { return id === "virtual:ec-runtime" ? "\0virtual:ec-runtime" : undefined; },
			load(id) {
				if (id !== "\0virtual:ec-runtime") return;
				if (runtime === undefined) throw new Error("Expressive Code runtime is not initialized");
				return runtime;
			},
		}] } });
	};
	return integration;
}
