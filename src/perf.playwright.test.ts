import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { startServer } from './server.js';

const root = path.resolve('.tmp-test-perf-docs');

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('initial page rendering perf', () => {
  it('renders visible content without waiting for processed page', async () => {
    await fs.mkdir(path.join(root, 'guides'), { recursive: true });
    await fs.writeFile(path.join(root, 'README.md'), '# Home');
    await fs.writeFile(path.join(root, 'guides', 'intro.md'), '# Intro\n\nBody content');

    const server = await startServer({ docsDir: root, port: 0 });
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const start = Date.now();
    await page.goto(`http://localhost:${server.port}/guides/intro`);
    await page.waitForFunction(() => {
      const el = document.getElementById('page-content');
      return Boolean(el && el.textContent && el.textContent.includes('Body content'));
    });
    const ms = Date.now() - start;

    expect(ms).toBeLessThan(2500);

    await browser.close();
    await server.close();
  });
});
