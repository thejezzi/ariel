import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSiteData } from './tree.js';

const root = path.resolve('.tmp-test-docs');

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('buildSiteData', () => {
  it('uses top-level README as start page and respects .order', async () => {
    await fs.mkdir(path.join(root, 'guides'), { recursive: true });
    await fs.writeFile(path.join(root, 'README.md'), '# Home');
    await fs.writeFile(path.join(root, '.order'), 'guides\nREADME.md\n');
    await fs.writeFile(path.join(root, 'guides', '.order'), 'advanced.mdx\nintro.md\n');
    await fs.writeFile(path.join(root, 'guides', 'intro.md'), '# Intro');
    await fs.writeFile(path.join(root, 'guides', 'advanced.mdx'), '# Advanced');

    const site = await buildSiteData(root);

    expect(site.startPage).toBe('README');
    expect(site.tree[0].kind).toBe('directory');
    expect(site.tree[0].children?.map((child) => child.name)).toEqual(['advanced.mdx', 'intro.md']);
  });
});
