import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer } from './server.js';

const root = path.resolve('.tmp-test-server-reload');

async function getSse(port: number, onEvent: (chunk: string) => void, abort: AbortController): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/reload', method: 'GET', headers: { Accept: 'text/event-stream' } },
      (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          onEvent(chunk);
          if (chunk.includes('event: reload')) {
            abort.abort();
            resolve();
          }
        });
        res.on('end', () => resolve());
        res.on('error', () => resolve());
      },
    );
    req.on('error', reject);
    abort.signal.addEventListener('abort', () => {
      req.destroy();
      resolve();
    });
    req.end();
  });
}

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('startServer reload stream', () => {
  it('broadcasts a reload event when a watched file changes', async () => {
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'doc.md');
    await fs.writeFile(file, '# one');

    const server = await startServer({ docsDir: root, port: 0 });
    const port = server.port;
    try {
      const abort = new AbortController();
      const seen: string[] = [];
      const waitForReload = getSse(port, (chunk) => seen.push(chunk), abort);
      // Give the SSE connection a moment to register before mutating the file.
      await new Promise((resolve) => setTimeout(resolve, 100));
      await fs.writeFile(file, '# two');
      await waitForReload;
      expect(seen.join('')).toContain('event: reload');
    } finally {
      await server.close();
    }
  });
});
