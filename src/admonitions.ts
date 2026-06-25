import { visit } from 'unist-util-visit';

const ADMONITION_TYPES = new Set(['note', 'tip', 'important', 'warning', 'caution']);

function toTitle(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function remarkAdmonitions() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      const firstParagraph = node.children?.[0];
      const firstText = firstParagraph?.type === 'paragraph' ? firstParagraph.children?.[0] : null;
      if (!firstText || firstText.type !== 'text') return;

      const match = firstText.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
      if (!match) return;

      const type = match[1].toLowerCase();
      if (!ADMONITION_TYPES.has(type)) return;

      firstText.value = firstText.value.replace(match[0], '');
      if (!firstText.value) firstParagraph.children.shift();
      if (firstParagraph.children.length === 0) node.children.shift();

      node.data ||= {};
      node.data.hName = 'div';
      node.data.hProperties = { className: ['admonition', `admonition-${type}`] };
      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'div', hProperties: { className: ['admonition-title'] } },
        children: [{ type: 'text', value: toTitle(type) }],
      });
    });
  };
}
