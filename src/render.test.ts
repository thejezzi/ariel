import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { renderDocument } from './render.js';

const root = path.resolve('.tmp-test-render');

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('renderDocument', () => {
  it('preserves mermaid blocks for client-side rendering', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'README.md');
    await fs.writeFile(file, '# Demo\n\n```ts\nconsole.log(1)\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```\n');

    const page = await renderDocument(file, 'README');

    expect(page.html).toContain('data-language="ts"');
    expect(page.html).toContain('class="mermaid"');
    expect(page.html).toContain('flowchart LR');
    expect(page.html).toContain('A --&gt; B');
  });

  it('rewrites markdown links to md files to extensionless ariel routes', async () => {
    await fs.mkdir(path.join(root, 'guides'), { recursive: true });
    const file = path.join(root, 'guides', 'intro.md');
    await fs.writeFile(file, '[CLI](../reference/cli.md)\n[Local](./advanced.md#deep-dive)\n[Readme](../README.md)\n');

    const page = await renderDocument(file, 'guides/intro');

    expect(page.html).toContain('href="/reference/cli"');
    expect(page.html).toContain('href="/guides/advanced#deep-dive"');
    expect(page.html).toContain('href="/README"');
  });
});
