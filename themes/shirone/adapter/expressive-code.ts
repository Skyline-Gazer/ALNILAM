import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { expressiveCodeConfig } from "../upstream/src/config/expressiveCodeConfig.ts";
import { expressiveCodeShared } from "../upstream/src/config/integrationsConfig.ts";
import { pluginLanguageBadge } from "../upstream/src/plugins/expressive-code/language-badge.ts";
import { pluginCustomCopyButton } from "../upstream/src/plugins/expressive-code/custom-copy-button.ts";

export function createExpressiveCodeIntegration() {
	return expressiveCode({
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
	});
}
