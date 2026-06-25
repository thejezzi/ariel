import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSiteData, findNodeByRoute } from './tree.js';
import { renderDocument } from './render.js';
import { buildSearchDocuments } from './search.js';

const root = path.resolve('.tmp-test-search');

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('buildSearchDocuments', () => {
  it('indexes title headings body text', async () => {
    await fs.mkdir(path.join(root, 'guides'), { recursive: true });
    await fs.writeFile(path.join(root, 'README.md'), '# Home\n\nWelcome root text.');
    await fs.writeFile(path.join(root, 'guides', 'intro.md'), '---\ntitle: Intro Title\n---\n\n# Intro\n\n## Install\n\nBody text for search target.');

    const site = await buildSiteData(root);
    const intro = findNodeByRoute(site.tree, 'guides/intro');
    if (!intro || intro.kind !== 'file' || !intro.filePath) throw new Error('missing intro');

    const page = await renderDocument(intro.filePath, intro.routePath, root);
    const docs = buildSearchDocuments(site, [page]);

    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Intro Title');
    expect(docs[0].headings).toContain('Install');
    expect(docs[0].bodyText).toContain('Body text for search target.');
  });
});
