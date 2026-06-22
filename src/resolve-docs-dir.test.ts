import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDocsDir } from './resolve-docs-dir.js';

const root = path.resolve('.tmp-test-docs-resolve');

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('resolveDocsDir', () => {
  it('defaults to nested docs folder when present', async () => {
    await fs.mkdir(path.join(root, 'project', 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'project', 'docs', 'README.md'), '# Home');

    await expect(resolveDocsDir(path.join(root, 'project'))).resolves.toBe(path.join(root, 'project', 'docs'));
  });

  it('uses the provided directory directly when it already contains docs files', async () => {
    await fs.mkdir(path.join(root, 'manual-docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'manual-docs', 'README.mdx'), '# Home');

    await expect(resolveDocsDir(path.join(root, 'manual-docs'))).resolves.toBe(path.join(root, 'manual-docs'));
  });

  it('keeps explicit docs subdirectory paths unchanged', async () => {
    await fs.mkdir(path.join(root, 'project', 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'project', 'docs', 'README.md'), '# Home');

    await expect(resolveDocsDir(path.join(root, 'project', 'docs'))).resolves.toBe(path.join(root, 'project', 'docs'));
  });
});
