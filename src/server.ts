import fs from "node:fs/promises";
import { unwatchFile, watch, watchFile, type FSWatcher } from "node:fs";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteData, findPageNodeByRoute } from "./tree.js";
import { IGNORED_DIR_NAMES } from "./utils.js";
import { renderDocument } from "./render.js";
import { buildSearchDocuments } from "./search.js";
import { annotateBrokenLinks } from "./links.js";

export interface StartServerOptions {
	docsDir: string;
	port: number;
	singleFile?: string;
}

// Try to set up a single recursive watcher. Returns the watcher on success,
// or null when the platform/Node version does not support recursive watching
// (in which case callers fall back to one watcher per directory).
function tryRecursiveWatcher(
	rootDir: string,
	onChange: () => void,
): FSWatcher | null {
	try {
		const watcher = watch(rootDir, { recursive: true }, () => onChange());
		watcher.on("error", () => {});
		return watcher;
	} catch {
		return null;
	}
}

export async function startServer(options: StartServerOptions) {
	const app = express();
	const site = await buildSiteData(options.docsDir, {
		singleFile: options.singleFile,
	});
	const here = path.dirname(fileURLToPath(import.meta.url));
	const clientPath = path.join(here, "client");
	const clientIndexHtml = await fs.readFile(
		path.join(clientPath, "index.html"),
		"utf8",
	);

	let cachedSite: Awaited<ReturnType<typeof buildSiteData>> | null = null;
	let cachedPages: Awaited<ReturnType<typeof renderDocument>>[] | null = null;
	let pageCache = new Map<string, Awaited<ReturnType<typeof renderDocument>>>();
	let watchers: Array<{ close: () => void }> = [];
	const sseClients = new Set<express.Response>();
	let reloadTimer: NodeJS.Timeout | null = null;
	let heartbeatTimer: NodeJS.Timeout | null = null;
	const RELOAD_DEBOUNCE_MS = 150;
	const HEARTBEAT_INTERVAL_MS = 30_000;

	function invalidateCache() {
		cachedSite = null;
		cachedPages = null;
		pageCache = new Map();
	}

	function broadcastReload() {
		if (reloadTimer) clearTimeout(reloadTimer);
		reloadTimer = setTimeout(() => {
			reloadTimer = null;
			for (const client of sseClients) {
				try {
					client.write("event: reload\ndata: \n\n");
				} catch {
					sseClients.delete(client);
				}
			}
		}, RELOAD_DEBOUNCE_MS);
	}

	async function setupWatchers(targetPath: string) {
		watchers.forEach((watcher) => watcher.close());
		watchers = [];

		const onChange = () => {
			invalidateCache();
			broadcastReload();
		};

		const stat = await fs.stat(targetPath).catch(() => null);
		if (stat?.isFile()) {
			// fs.watch on the file goes silent when an editor saves by renaming a
			// temp file over it; watchFile polls the path and survives the swap.
			// shortcut: 150ms polling latency, raise/rewrite if it ever costs CPU.
			watchFile(
				targetPath,
				{ interval: 150 },
				(current, previous) => {
					if (
						current.mtimeMs !== previous.mtimeMs ||
						current.size !== previous.size
					) {
						onChange();
					}
				},
			);
			watchers.push({ close: () => unwatchFile(targetPath) });
			return;
		}

		const rootDir = targetPath;

		// Prefer a single recursive watcher when the platform supports it.
		// One descriptor covers the whole tree, avoiding EMFILE on large doc
		// folders (e.g. a repo with many subdirectories). macOS uses FSEvents,
		// Windows uses ReadDirectoryChangesW; recent Node supports it on Linux too.
		const recursive = tryRecursiveWatcher(rootDir, onChange);
		if (recursive) {
			watchers.push(recursive);
			return;
		}

		// Fallback: one watcher per directory. Errors are swallowed per watcher
		// so a missing/deleted directory never crashes the server (EMFILE etc.).
		const dirs: string[] = [];
		async function collectDirs(dir: string) {
			dirs.push(dir);
			const entries = await fs
				.readdir(dir, { withFileTypes: true })
				.catch(() => []);
			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				if (IGNORED_DIR_NAMES.includes(entry.name)) continue;
				await collectDirs(path.join(dir, entry.name));
			}
		}

		await collectDirs(rootDir);

		for (const dir of dirs) {
			try {
				const watcher = watch(dir, () => {
					invalidateCache();
					broadcastReload();
					setupWatchers(rootDir).catch(() => {});
				});
				watcher.on("error", () => {});
				watchers.push(watcher);
			} catch {
				// ignore watcher setup failures per-directory
			}
		}
	}

	async function getSite() {
		cachedSite ??= await buildSiteData(options.docsDir, {
			singleFile: options.singleFile,
		});
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
				if (item.kind === "file" && item.filePath)
					fileNodes.push({
						filePath: item.filePath,
						routePath: item.routePath,
					});
				if (item.kind === "directory") walk(item.children ?? []);
			}
		};
		walk(nextSite.tree);
		cachedPages = await Promise.all(
			fileNodes.map((item) => getRenderedPage(item.filePath, item.routePath)),
		);
		return cachedPages;
	}

	app.get("/api/site", async (_req, res, next) => {
		try {
			res.json(await getSite());
		} catch (error) {
			next(error);
		}
	});

	async function resolvePageNode(rawRoutePath: string) {
		const routePath = rawRoutePath.replace(/^\/+/, "").replace(/\/+$/, "");
		const nextSite = await getSite();
		const actualPath = routePath || nextSite.startPage;
		const node = findPageNodeByRoute(nextSite.tree, actualPath);
		if (!node || node.kind !== "file" || !node.filePath) return null;
		return { site: nextSite, node };
	}

	app.get("/api/page/{*splat}", async (req, res, next) => {
		try {
			const splat = req.params.splat;
			const payload = await resolvePageNode(
				Array.isArray(splat) ? splat.join("/") : String(splat || ""),
			);
			if (!payload) {
				res.status(404).json({ error: "Page not found" });
				return;
			}
			const page = await getRenderedPage(
				payload.node.filePath!,
				payload.node.routePath,
			);
			res.json({
				site: payload.site,
				resolvedRoutePath: page.routePath,
				page,
			});
		} catch (error) {
			next(error);
		}
	});

	app.get("/api/page-processed/{*splat}", async (req, res, next) => {
		try {
			const splat = req.params.splat;
			const payload = await resolvePageNode(
				Array.isArray(splat) ? splat.join("/") : String(splat || ""),
			);
			if (!payload) {
				res.status(404).json({ error: "Page not found" });
				return;
			}
			const pages = await getAllPages();
			const page =
				pages.find((item) => item.routePath === payload.node.routePath) ??
				(await getRenderedPage(payload.node.filePath!, payload.node.routePath));
			res.json({
				site: payload.site,
				resolvedRoutePath: page.routePath,
				page: annotateBrokenLinks(page, pages),
			});
		} catch (error) {
			next(error);
		}
	});

	app.get("/api/search-index", async (_req, res, next) => {
		try {
			const nextSite = await getSite();
			const pages = await getAllPages();
			res.json(buildSearchDocuments(nextSite, pages));
		} catch (error) {
			next(error);
		}
	});

	app.get("/api/reload", (req, res) => {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache, no-transform");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();
		res.write(":ok\n\n");

		sseClients.add(res);
		req.on("close", () => {
			sseClients.delete(res);
		});
	});

	app.use("/assets", express.static(clientPath));
	app.use("/docs-assets", express.static(options.docsDir));
	app.get(["/", "/{*splat}"], (_req, res) => {
		res.type("html").send(clientIndexHtml);
	});

	app.use(
		(
			error: unknown,
			_req: express.Request,
			res: express.Response,
			_next: express.NextFunction,
		) => {
			const message = error instanceof Error ? error.message : "Unknown error";
			res.status(500).json({ error: message });
		},
	);

	await setupWatchers(
		options.singleFile
			? path.resolve(options.docsDir, options.singleFile)
			: options.docsDir,
	);

	const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
		const instance = app.listen(options.port, () => resolve(instance));
	});

	heartbeatTimer = setInterval(() => {
		for (const client of sseClients) {
			try {
				client.write(":hb\n\n");
			} catch {
				sseClients.delete(client);
			}
		}
	}, HEARTBEAT_INTERVAL_MS);

	getAllPages().catch(() => {});

	const address = server.address();
	const port =
		typeof address === "object" && address ? address.port : options.port;

	return {
		app,
		site,
		port,
		close: () =>
			new Promise<void>((resolve, reject) => {
				if (reloadTimer) {
					clearTimeout(reloadTimer);
					reloadTimer = null;
				}
				if (heartbeatTimer) {
					clearInterval(heartbeatTimer);
					heartbeatTimer = null;
				}
				for (const client of sseClients) {
					try {
						client.end();
					} catch {
						// ignore
					}
				}
				sseClients.clear();
				watchers.forEach((watcher) => watcher.close());
				server.close((error) => (error ? reject(error) : resolve()));
			}),
	};
}
