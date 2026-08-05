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

    const page = await renderDocument(file, 'guides/intro', root);

    expect(page.html).toContain('href="/reference/cli"');
    expect(page.html).toContain('href="/guides/advanced#deep-dive"');
    expect(page.html).toContain('href="/README"');
  });

  it('rewrites local image sources to docs asset urls', async () => {
    await fs.mkdir(path.join(root, 'reference', 'elmo'), { recursive: true });
    const file = path.join(root, 'reference', 'elmo', 'README.md');
    await fs.writeFile(file, '![Logo](./elmo-logo.png)\n<img src="../shared/mascot.svg" alt="Mascot" />\n');

    const page = await renderDocument(file, 'reference/elmo/README', root);

    expect(page.html).toContain('src="/docs-assets/reference/elmo/elmo-logo.png"');
    expect(page.html).toContain('src="/docs-assets/reference/shared/mascot.svg"');
  });

  it('resolves reference links whose definition is glued to a paragraph', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'README.md');
    await fs.writeFile(file, 'See [send_all_offers][1] for details.\n[1]: https://example.com/send_all_offers\n');

    const page = await renderDocument(file, 'README');

    expect(page.html).toContain('<a href="https://example.com/send_all_offers">send_all_offers</a>');
    expect(page.html).not.toContain('[send_all_offers][1]');
    expect(page.html).not.toContain('[1]:');
  });

  it('resolves reference links glued to a list item', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'README.md');
    await fs.writeFile(file, '- [send_all_offers][1]\n[1]: https://example.com/send_all_offers\n');

    const page = await renderDocument(file, 'README');

    expect(page.html).toContain('<a href="https://example.com/send_all_offers">send_all_offers</a>');
  });

  it('leaves reference-definition lines inside fenced code blocks literal', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'README.md');
    await fs.writeFile(
      file,
      [
        'See [send_all_offers][1] for details.',
        '[1]: https://example.com/send_all_offers',
        '',
        '```',
        'literal [send_all_offers][2]',
        '[2]: https://inside-code.example',
        '```',
        '',
      ].join('\n'),
    );

    const page = await renderDocument(file, 'README');

    expect(page.html).toContain('<a href="https://example.com/send_all_offers">send_all_offers</a>');
    expect(page.html).toContain('[2]: https://inside-code.example');
    expect(page.html).not.toContain('href="https://inside-code.example"');
  });

  it('renders note admonitions', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'README.md');
    await fs.writeFile(file, '> [!NOTE]\n> Hello note\n');

    const page = await renderDocument(file, 'README', root);

    expect(page.html).toContain('class="admonition admonition-note"');
    expect(page.html).toContain('admonition-title">Note<');
    expect(page.html).toContain('Hello note');
  });
});
