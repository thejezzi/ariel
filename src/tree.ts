import fs from 'node:fs/promises';
import path from 'node:path';
import { parseOrderFile, sortNames } from './order.js';
import { DocNode, SiteData } from './types.js';
import { isDocFile, routeFromRelativePath, titleFromName } from './utils.js';

interface DirEntryInfo {
  name: string;
  absolutePath: string;
  isDirectory: boolean;
}

async function readDirectoryEntries(dir: string): Promise<DirEntryInfo[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => !['node_modules', '.git', '.a5c', 'dist', 'coverage'].includes(entry.name))
    .filter((entry) => entry.isDirectory() || isDocFile(entry.name))
    .map((entry) => ({
      name: entry.name,
      absolutePath: path.join(dir, entry.name),
      isDirectory: entry.isDirectory(),
    }));
}

async function readOrder(dir: string): Promise<string[]> {
  try {
    return parseOrderFile(await fs.readFile(path.join(dir, '.order'), 'utf8'));
  } catch {
    return [];
  }
}

function moveReadmeFirst(nodes: DocNode[], isRootDir: boolean): DocNode[] {
  if (isRootDir) return nodes;
  const readmeIndex = nodes.findIndex((node) => node.kind === 'file' && /^readme\.(md|mdx)$/i.test(node.name));
  if (readmeIndex <= 0) return nodes;
  const [readme] = nodes.splice(readmeIndex, 1);
  nodes.unshift(readme);
  return nodes;
}

async function buildNodes(rootDir: string, currentDir: string): Promise<DocNode[]> {
  const entries = sortNames(await readDirectoryEntries(currentDir), await readOrder(currentDir));
  const nodes: DocNode[] = [];

  for (const entry of entries) {
    const relativePath = path.relative(rootDir, entry.absolutePath);
    if (entry.isDirectory) {
      const children = await buildNodes(rootDir, entry.absolutePath);
      if (children.length === 0) continue;
      nodes.push({
        kind: 'directory',
        name: entry.name,
        title: titleFromName(entry.name),
        fullPath: relativePath,
        routePath: routeFromRelativePath(relativePath),
        children,
      });
    } else {
      const extension = path.extname(entry.name).toLowerCase() as '.md' | '.mdx';
      nodes.push({
        kind: 'file',
        name: entry.name,
        title: titleFromName(entry.name),
        fullPath: relativePath,
        routePath: routeFromRelativePath(relativePath),
        filePath: entry.absolutePath,
        extension,
      });
    }
  }

  return moveReadmeFirst(nodes, path.resolve(rootDir) === path.resolve(currentDir));
}

function flattenFiles(nodes: DocNode[]): DocNode[] {
  return nodes.flatMap((node) => node.kind === 'file' ? [node] : flattenFiles(node.children ?? []));
}

function findStartPage(files: DocNode[]): DocNode {
  const readmes = files.filter((file) => /^readme\.(md|mdx)$/i.test(file.name));
  if (readmes.length > 0) {
    return readmes.sort((a, b) => a.fullPath.split(path.sep).length - b.fullPath.split(path.sep).length)[0];
  }
  return files[0];
}

export async function buildSiteData(docsDir: string): Promise<SiteData> {
  const resolvedDocsDir = path.resolve(docsDir);
  const stat = await fs.stat(resolvedDocsDir).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Docs directory not found: ${resolvedDocsDir}`);

  const tree = await buildNodes(resolvedDocsDir, resolvedDocsDir);
  const files = flattenFiles(tree);
  if (files.length === 0) throw new Error(`No .md or .mdx files found in ${resolvedDocsDir}`);

  return {
    docsDir: resolvedDocsDir,
    startPage: findStartPage(files).routePath,
    tree,
  };
}

export function findNodeByRoute(nodes: DocNode[], routePath: string): DocNode | undefined {
  for (const node of nodes) {
    if (node.kind === 'file' && node.routePath === routePath) return node;
    if (node.kind === 'directory') {
      const found = findNodeByRoute(node.children ?? [], routePath);
      if (found) return found;
    }
  }
  return undefined;
}

function findFirstFileInDirectory(node: DocNode): DocNode | undefined {
  if (node.kind === 'file') return node;
  for (const child of node.children ?? []) {
    if (child.kind === 'file') return child;
    const nested = findFirstFileInDirectory(child);
    if (nested) return nested;
  }
  return undefined;
}

export function findPageNodeByRoute(nodes: DocNode[], routePath: string): DocNode | undefined {
  for (const node of nodes) {
    if (node.kind === 'file' && node.routePath === routePath) return node;
    if (node.kind === 'directory') {
      if (node.routePath === routePath) return findFirstFileInDirectory(node);
      const found = findPageNodeByRoute(node.children ?? [], routePath);
      if (found) return found;
    }
  }
  return undefined;
}
