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
});
