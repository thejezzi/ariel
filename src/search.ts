import { DocNode } from './types.js';

export interface SearchDocument {
  id: string;
  title: string;
  routePath: string;
  headings: string[];
  bodyText: string;
}

function flattenFiles(nodes: DocNode[]): DocNode[] {
  return nodes.flatMap((node) => node.kind === 'file' ? [node] : flattenFiles(node.children ?? []));
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<pre class="mermaid"[\s\S]*?<\/pre>/g, ' ')
    .replace(/<code[\s\S]*?<\/code>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchDocuments(site: { tree: DocNode[] }, pages: Array<{ routePath: string; title: string; html: string; tableOfContents: Array<{ text: string }> }>): SearchDocument[] {
  const files = new Set(flattenFiles(site.tree).map((node) => node.routePath));

  return pages
    .filter((page) => files.has(page.routePath))
    .map((page) => ({
      id: page.routePath,
      title: page.title,
      routePath: page.routePath,
      headings: page.tableOfContents.map((entry) => entry.text),
      bodyText: htmlToPlainText(page.html),
    }));
}
