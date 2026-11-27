import { h } from "hastscript";
import { visit } from "unist-util-visit";

export function parseDirectiveNode() {
	return (tree, { _data }) => {
		visit(tree, (node, index, parent) => {
			// remark-directive parses plain text such as a:b as an empty inline directive.
			if (node.type === "textDirective" && node.children.length === 0 && Object.keys(node.attributes ?? {}).length === 0) {
				parent.children[index] = { type: "text", value: `:${node.name}`, position: node.position };
				return;
			}
			if (
				node.type === "containerDirective" ||
				node.type === "leafDirective" ||
				node.type === "textDirective"
			) {
				// biome-ignore lint/suspicious/noAssignInExpressions: <check later>
				const data = node.data || (node.data = {});
				node.attributes = node.attributes || {};
				if (
					node.children.length > 0 &&
					node.children[0].data &&
					node.children[0].data.directiveLabel
				) {
					// Add a flag to the node to indicate that it has a directive label
					node.attributes["has-directive-label"] = true;
				}
				const hast = h(node.name, node.attributes);

				data.hName = hast.tagName;
				data.hProperties = hast.properties;
			}
		});
	};
}
