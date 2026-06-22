import fs from 'node:fs/promises';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSiteData, findNodeByRoute } from './tree.js';
import { renderDocument } from './render.js';

export interface StartServerOptions {
  docsDir: string;
  port: number;
}

export async function startServer(options: StartServerOptions) {
  const app = express();
  const site = await buildSiteData(options.docsDir);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientPath = path.join(here, 'client');
  const clientIndexHtml = await fs.readFile(path.join(clientPath, 'index.html'), 'utf8');

  app.get('/api/site', async (_req, res, next) => {
    try {
      res.json(await buildSiteData(options.docsDir));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/page/{*splat}', async (req, res, next) => {
    try {
      const routePath = String(req.params.splat || '').replace(/^\/+/, '');
      const actualPath = routePath || site.startPage;
      const nextSite = await buildSiteData(options.docsDir);
      const node = findNodeByRoute(nextSite.tree, actualPath);
      if (!node || node.kind !== 'file' || !node.filePath) {
        res.status(404).json({ error: `Page not found: ${actualPath}` });
        return;
      }
      res.json({
        site: nextSite,
        page: await renderDocument(node.filePath, node.routePath),
      });
    } catch (error) {
      next(error);
    }
  });

  app.use('/assets', express.static(clientPath));
  app.get(['/', '/{*splat}'], (_req, res) => {
    res.type('html').send(clientIndexHtml);
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(options.port, () => resolve(instance));
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : options.port;

  return {
    app,
    site,
    port,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
