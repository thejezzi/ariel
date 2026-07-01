import fs from 'node:fs/promises';
import path from 'node:path';
import { isDocFile, toPosixPath } from './utils.js';

export interface ResolvedDocsTarget {
  docsDir: string;
  singleFile?: string;
}

async function existsDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function resolveFileTarget(filePath: string): Promise<ResolvedDocsTarget> {
  const absolute = path.resolve(filePath);
  const stat = await fs.stat(absolute).catch(() => null);
  if (!stat?.isFile()) throw new Error(`File not found: ${filePath}`);
  if (!isDocFile(path.basename(absolute))) {
    throw new Error(`Single-file mode only supports .md or .mdx files: ${filePath}`);
  }

  let current = path.dirname(absolute);
  while (true) {
    if (path.basename(current).toLowerCase() === 'docs') {
      return { docsDir: current, singleFile: toPosixPath(path.relative(current, absolute)) };
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return { docsDir: path.dirname(absolute), singleFile: path.basename(absolute) };
}

async function resolveDirectory(input?: string): Promise<ResolvedDocsTarget> {
  const base = path.resolve(input || '.');
  const nestedDocs = path.join(base, 'docs');

  let docsDir: string;
  if (path.basename(base).toLowerCase() === 'docs') docsDir = base;
  else if (await existsDirectory(nestedDocs)) docsDir = nestedDocs;
  else docsDir = base;

  return { docsDir };
}

export async function resolveDocsTarget(input?: string): Promise<ResolvedDocsTarget> {
  const base = path.resolve(input || '.');
  const stat = await fs.stat(base).catch(() => null);

  if (stat?.isFile()) return resolveFileTarget(base);
  return resolveDirectory(input);
}

export async function resolveDocsDir(input?: string): Promise<string> {
  return (await resolveDocsTarget(input)).docsDir;
}
