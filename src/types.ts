export type DocKind = 'file' | 'directory';

export interface DocNode {
  kind: DocKind;
  name: string;
  title: string;
  fullPath: string;
  routePath: string;
  filePath?: string;
  extension?: '.md' | '.mdx';
  children?: DocNode[];
}

export interface PageData {
  title: string;
  routePath: string;
  sourcePath: string;
  html: string;
  tableOfContents: Array<{ depth: number; text: string; id: string }>;
}

export interface SiteData {
  docsDir: string;
  startPage: string;
  tree: DocNode[];
}
