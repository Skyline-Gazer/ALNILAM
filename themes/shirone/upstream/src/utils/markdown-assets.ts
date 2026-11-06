import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import markdownManifest from "../plugins/markdown/manifest.json" with {
	type: "json",
};

type MarkdownStylesheetPack = {
	id: string;
	syntaxes: readonly string[];
	styles: readonly string[];
};

type MarkdownSyntaxSnapshot = {
	schema: 1;
	syntaxes: readonly string[];
};

const stylesheetPacks =
	markdownManifest.stylesheetPacks as readonly MarkdownStylesheetPack[];

/** Resolve manifest paths through Vite so emitted URLs include the configured base. */
let stylesheetUrls: Record<string, string> | undefined;
try {
	stylesheetUrls = import.meta.glob("../styles/**/*.css", {
		query: "?url&no-inline",
		import: "default",
		eager: true,
	}) as Record<string, string>;
} catch {
	// Plain Node does not provide import.meta.glob (for example, in unit tests).
	stylesheetUrls = undefined;
}

function getStylesheetUrl(stylePath: string): string {
	if (stylesheetUrls) {
		const key = `../${stylePath.replace(/^src\//, "")}`;
		const url = stylesheetUrls[key];
		if (url === undefined) {
			throw new Error(
				`[markdown-assets] ${stylePath} is declared in the Markdown manifest but was not found under src/styles/.`,
			);
		}
		return url;
	}
	const path = fileURLToPath(new URL(`../${stylePath.replace(/^src\//, "")}`, import.meta.url));
	if (!existsSync(path)) {
		throw new Error(`[markdown-assets] ${stylePath} was not found.`);
	}
	return pathToFileURL(path).href;
}

/**
 * Resolves each stylesheet from manifest-owned syntax declarations.
 * Templates mark links as Swup-optional so stale styles are removed on navigation.
 */
export async function getMarkdownStylesheetAssets(
	snapshot: MarkdownSyntaxSnapshot,
): Promise<Array<{ pack: string; href: string }>> {
	const activePacks = stylesheetPacks.filter(({ syntaxes }) =>
		syntaxes.some((syntaxId) => snapshot.syntaxes.includes(syntaxId)),
	);

	return activePacks.flatMap(({ id, styles }) =>
		styles.map((style) => ({ pack: id, href: getStylesheetUrl(style) })),
	);
}
