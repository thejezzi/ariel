import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { compile, run } from '@mdx-js/mdx';
import * as jsxRuntime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import { remarkAdmonitions } from './admonitions.js';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeRaw from 'rehype-raw';
import { PageData } from './types.js';
import { extractTableOfContents } from './toc.js';
import { normalizeAssetSrc, normalizeDocHref, titleFromName } from './utils.js';

function preprocessMermaid(source: string): string {
  return source.replace(/```mermaid\n([\s\S]*?)```/g, (_match, code: string) => {
    const rawCode = code.trimEnd();
    const escaped = rawCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const escapedAttribute = rawCode
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `\n<pre class="mermaid" data-mermaid-source="${escapedAttribute}">${escaped}</pre>\n`;
  });
}

const prettyCodeOptions = {
  theme: {
    light: 'one-light',
    dark: 'one-dark-pro',
    dracula: 'dracula',
    tokyo: 'tokyo-night',
    catppuccin: 'catppuccin-mocha',
    sublime: 'monokai',
  },
  keepBackground: false,
};

function rewriteDocLinks(html: string, routePath: string): string {
  return html.replace(/href="([^"]+)"/g, (match, href: string) => {
    const normalized = normalizeDocHref(href, routePath);
    return normalized === href ? match : `href="${normalized}"`;
  });
}

function rewriteAssetSources(html: string, routePath: string): string {
  return html.replace(/src="([^"]+)"/g, (match, src: string) => {
    const normalized = normalizeAssetSrc(src, routePath);
    return normalized === src ? match : `src="${normalized}"`;
  });
}

function extractAnchorIds(html: string): string[] {
  return [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
}

export async function renderDocument(filePath: string, routePath: string, _docsDir?: string): Promise<PageData> {
  const source = await fs.readFile(filePath, 'utf8');
  const { content, data } = matter(source);
  const extension = path.extname(filePath).toLowerCase();
  const preparedContent = preprocessMermaid(content);

  const isMdx = extension === '.mdx';

  const compiled = await compile(preparedContent, {
    outputFormat: 'function-body',
    development: false,
    format: isMdx ? 'mdx' : 'md',
    remarkPlugins: [remarkGfm, remarkAdmonitions],
    rehypePlugins: [
      ...isMdx ? [] : [rehypeRaw],
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
  const html = rewriteAssetSources(rewriteDocLinks(renderToStaticMarkup(React.createElement(Content)), routePath), routePath);
  const title = typeof data.title === 'string' ? data.title : titleFromName(path.basename(filePath));

  return {
    title,
    routePath,
    sourcePath: filePath,
    html,
    tableOfContents: extractTableOfContents(html),
    anchorIds: extractAnchorIds(html),
  };
}
