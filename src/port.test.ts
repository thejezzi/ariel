import { describe, expect, it } from 'vitest';
import net from 'node:net';
import { findAvailablePort } from './port.js';

describe('findAvailablePort', () => {
  it('returns preferred port when free', async () => {
    const port = await findAvailablePort(46781);
    expect(port).toBe(46781);
  });

  it('falls back when preferred port is busy', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(46782, resolve));
    try {
      const port = await findAvailablePort(46782);
      expect(port).not.toBe(46782);
      expect(port).toBeGreaterThan(0);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
