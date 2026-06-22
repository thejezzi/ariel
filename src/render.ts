import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { compile, run } from '@mdx-js/mdx';
import * as jsxRuntime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import { visit } from 'unist-util-visit';
import { PageData } from './types.js';
import { extractTableOfContents } from './toc.js';
import { titleFromName } from './utils.js';

function remarkMermaid() {
  return (tree: unknown) => {
    visit(tree as any, 'code', (node: any) => {
      if (node.lang === 'mermaid') {
        node.type = 'html';
        node.value = `<pre class="mermaid">${node.value}</pre>`;
      }
    });
  };
}

const prettyCodeOptions = {
  theme: 'github-dark',
  keepBackground: false,
};

export async function renderDocument(filePath: string, routePath: string): Promise<PageData> {
  const source = await fs.readFile(filePath, 'utf8');
  const { content, data } = matter(source);
  const extension = path.extname(filePath).toLowerCase();

  const compiled = await compile(content, {
    outputFormat: 'function-body',
    development: false,
    format: extension === '.mdx' ? 'mdx' : 'md',
    remarkPlugins: [remarkGfm, remarkMermaid],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      [rehypePrettyCode, prettyCodeOptions],
    ],
  });

  const runtime = await run(compiled, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  });

  const Content = runtime.default;
  const html = renderToStaticMarkup(React.createElement(Content));
  const title = typeof data.title === 'string' ? data.title : titleFromName(path.basename(filePath));

  return {
    title,
    routePath,
    sourcePath: filePath,
    html,
    tableOfContents: extractTableOfContents(html),
  };
}
