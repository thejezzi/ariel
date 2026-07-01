import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSiteData, findPageNodeByRoute } from './tree.js';

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

  it('falls back to first page when route points to directory', async () => {
    await fs.mkdir(path.join(root, 'ref', 'dir'), { recursive: true });
    await fs.writeFile(path.join(root, 'ref', 'dir', 'README.md'), '# Dir Home');
    await fs.writeFile(path.join(root, 'ref', 'dir', 'next.md'), '# Next');

    const site = await buildSiteData(root);
    const page = findPageNodeByRoute(site.tree, 'ref/dir');

    expect(page?.kind).toBe('file');
    expect(page?.routePath).toBe('ref/dir/README');
  });

  it('limits the tree to a single file when singleFile is given', async () => {
    await fs.mkdir(path.join(root, 'guides'), { recursive: true });
    await fs.writeFile(path.join(root, 'README.md'), '# Home');
    await fs.writeFile(path.join(root, 'guides', 'intro.md'), '# Intro');
    await fs.writeFile(path.join(root, 'guides', 'install.md'), '# Install');

    const site = await buildSiteData(root, { singleFile: 'guides/install.md' });

    expect(site.startPage).toBe('guides/install');
    expect(site.tree).toHaveLength(1);
    expect(site.tree[0].kind).toBe('file');
    expect(site.tree[0].routePath).toBe('guides/install');
    expect(site.tree[0].filePath).toBe(path.join(root, 'guides', 'install.md'));
  });

  it('errors out when the single file is missing', async () => {
    await fs.mkdir(root, { recursive: true });
    await expect(buildSiteData(root, { singleFile: 'missing.md' })).rejects.toThrow(/File not found/);
  });

  it('rejects non-markdown files in single-file mode', async () => {
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'config.json'), '{}');
    await expect(buildSiteData(root, { singleFile: 'config.json' })).rejects.toThrow(/Single-file mode only supports/);
  });
});
