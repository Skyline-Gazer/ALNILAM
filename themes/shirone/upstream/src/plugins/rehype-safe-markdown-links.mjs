/** Remove unsafe schemes from Markdown links while preserving their text. */
export function rehypeSafeMarkdownLinks() {
	return (tree) => {
		function visit(node) {
			if (node.type === "element" && node.tagName === "a" && typeof node.properties?.href === "string") {
				const href = node.properties.href.replace(/[\u0000-\u0020]/g, "");
				const scheme = /^([a-z][a-z\d+.-]*):/i.exec(href)?.[1]?.toLowerCase();
				if (scheme && !["http", "https", "mailto", "tel"].includes(scheme)) {
					delete node.properties.href;
				}
			}
			for (const child of node.children ?? []) visit(child);
		}
		visit(tree);
	};
}
