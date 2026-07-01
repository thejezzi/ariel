import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDocsDir, resolveDocsTarget } from './resolve-docs-dir.js';

const root = path.resolve('.tmp-test-docs-resolve');

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('resolveDocsTarget', () => {
  it('defaults to nested docs folder when present', async () => {
    await fs.mkdir(path.join(root, 'project', 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'project', 'docs', 'README.md'), '# Home');

    const target = await resolveDocsTarget(path.join(root, 'project'));

    expect(target).toEqual({ docsDir: path.join(root, 'project', 'docs') });
  });

  it('uses the provided directory directly when it already contains docs files', async () => {
    await fs.mkdir(path.join(root, 'manual-docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'manual-docs', 'README.mdx'), '# Home');

    const target = await resolveDocsTarget(path.join(root, 'manual-docs'));

    expect(target).toEqual({ docsDir: path.join(root, 'manual-docs') });
  });

  it('keeps explicit docs subdirectory paths unchanged', async () => {
    await fs.mkdir(path.join(root, 'project', 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'project', 'docs', 'README.md'), '# Home');

    const target = await resolveDocsTarget(path.join(root, 'project', 'docs'));

    expect(target).toEqual({ docsDir: path.join(root, 'project', 'docs') });
  });

  it('treats a markdown file as single-file mode with the file as start page', async () => {
    await fs.mkdir(path.join(root, 'project', 'docs', 'guides'), { recursive: true });
    const file = path.join(root, 'project', 'docs', 'guides', 'install.md');
    await fs.writeFile(file, '# Install');

    const target = await resolveDocsTarget(file);

    expect(target.docsDir).toBe(path.join(root, 'project', 'docs'));
    expect(target.singleFile).toBe('guides/install.md');
  });

  it('treats a top-level markdown file as single-file mode with the file basename', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'mydoc.md');
    await fs.writeFile(file, '# My Doc');

    const target = await resolveDocsTarget(file);

    expect(target.docsDir).toBe(root);
    expect(target.singleFile).toBe('mydoc.md');
  });

  it('rejects non-markdown files with a clear error', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'config.json');
    await fs.writeFile(file, '{}');

    await expect(resolveDocsTarget(file)).rejects.toThrow(/Single-file mode only supports \.md or \.mdx files/);
  });
});

describe('resolveDocsDir (legacy)', () => {
  it('returns the docsDir field for backwards compatibility', async () => {
    await fs.mkdir(path.join(root, 'project', 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'project', 'docs', 'README.md'), '# Home');

    await expect(resolveDocsDir(path.join(root, 'project'))).resolves.toBe(path.join(root, 'project', 'docs'));
  });
});
