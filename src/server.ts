import fs from 'node:fs/promises';
import { watch, FSWatcher } from 'node:fs';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSiteData, findNodeByRoute, findPageNodeByRoute } from './tree.js';
import { renderDocument } from './render.js';
import { buildSearchDocuments } from './search.js';
import { annotateBrokenLinks } from './links.js';

export interface StartServerOptions {
  docsDir: string;
  port: number;
  singleFile?: string;
}

export async function startServer(options: StartServerOptions) {
  const app = express();
  const site = await buildSiteData(options.docsDir, { singleFile: options.singleFile });
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientPath = path.join(here, 'client');
  const clientIndexHtml = await fs.readFile(path.join(clientPath, 'index.html'), 'utf8');

  let cachedSite: Awaited<ReturnType<typeof buildSiteData>> | null = null;
  let cachedPages: Awaited<ReturnType<typeof renderDocument>>[] | null = null;
  let pageCache = new Map<string, Awaited<ReturnType<typeof renderDocument>>>();
  let watchers: FSWatcher[] = [];

  function invalidateCache() {
    cachedSite = null;
    cachedPages = null;
    pageCache = new Map();
  }

  async function setupWatchers(rootDir: string) {
    watchers.forEach((watcher) => watcher.close());
    watchers = [];

    const dirs: string[] = [];
    async function collectDirs(dir: string) {
      dirs.push(dir);
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (['node_modules', '.git', '.a5c', 'dist', 'coverage'].includes(entry.name)) continue;
        await collectDirs(path.join(dir, entry.name));
      }
    }

    await collectDirs(rootDir);

    for (const dir of dirs) {
      try {
        const watcher = watch(dir, () => {
          invalidateCache();
          setupWatchers(rootDir).catch(() => {});
        });
        watchers.push(watcher);
      } catch {
        // ignore watcher setup failures per-directory
      }
    }
  }

  async function getSite() {
    cachedSite ??= await buildSiteData(options.docsDir, { singleFile: options.singleFile });
    return cachedSite;
  }

  async function getRenderedPage(filePath: string, routePath: string) {
    const cached = pageCache.get(routePath);
    if (cached) return cached;
    const page = await renderDocument(filePath, routePath, options.docsDir);
    pageCache.set(routePath, page);
    return page;
  }

  async function getAllPages() {
    if (cachedPages) return cachedPages;
    const nextSite = await getSite();
    const fileNodes: Array<{ filePath: string; routePath: string }> = [];
    const walk = (nodes: typeof nextSite.tree) => {
      for (const item of nodes) {
        if (item.kind === 'file' && item.filePath) fileNodes.push({ filePath: item.filePath, routePath: item.routePath });
        if (item.kind === 'directory') walk(item.children ?? []);
      }
    };
    walk(nextSite.tree);
    cachedPages = await Promise.all(fileNodes.map((item) => getRenderedPage(item.filePath, item.routePath)));
    return cachedPages;
  }

  app.get('/api/site', async (_req, res, next) => {
    try {
      res.json(await getSite());
    } catch (error) {
      next(error);
    }
  });

  async function resolvePageNode(rawRoutePath: string) {
    const routePath = rawRoutePath.replace(/^\/+/, '').replace(/\/+$/, '');
    const nextSite = await getSite();
    const actualPath = routePath || nextSite.startPage;
    const node = findPageNodeByRoute(nextSite.tree, actualPath);
    if (!node || node.kind !== 'file' || !node.filePath) return null;
    return { site: nextSite, node };
  }

  app.get('/api/page/{*splat}', async (req, res, next) => {
    try {
      const splat = req.params.splat;
      const payload = await resolvePageNode((Array.isArray(splat) ? splat.join('/') : String(splat || '')));
      if (!payload) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }
      const page = await getRenderedPage(payload.node.filePath!, payload.node.routePath);
      res.json({
        site: payload.site,
        resolvedRoutePath: page.routePath,
        page,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/page-processed/{*splat}', async (req, res, next) => {
    try {
      const splat = req.params.splat;
      const payload = await resolvePageNode((Array.isArray(splat) ? splat.join('/') : String(splat || '')));
      if (!payload) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }
      const pages = await getAllPages();
      const page = pages.find((item) => item.routePath === payload.node.routePath) ?? await getRenderedPage(payload.node.filePath!, payload.node.routePath);
      res.json({
        site: payload.site,
        resolvedRoutePath: page.routePath,
        page: annotateBrokenLinks(page, pages),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/search-index', async (_req, res, next) => {
    try {
      const nextSite = await getSite();
      const pages = await getAllPages();
      res.json(buildSearchDocuments(nextSite, pages));
    } catch (error) {
      next(error);
    }
  });

  app.use('/assets', express.static(clientPath));
  app.use('/docs-assets', express.static(options.docsDir));
  app.get(['/', '/{*splat}'], (_req, res) => {
    res.type('html').send(clientIndexHtml);
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  });

  await setupWatchers(options.docsDir);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(options.port, () => resolve(instance));
  });

  getAllPages().catch(() => {});

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : options.port;

  return {
    app,
    site,
    port,
    close: () => new Promise<void>((resolve, reject) => {
      watchers.forEach((watcher) => watcher.close());
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}
