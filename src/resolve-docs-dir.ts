import fs from 'node:fs/promises';
import path from 'node:path';

async function existsDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function containsDocFiles(target: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(target, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && /\.(md|mdx)$/i.test(entry.name));
  } catch {
    return false;
  }
}

export async function resolveDocsDir(input?: string): Promise<string> {
  const base = path.resolve(input || '.');
  const nestedDocs = path.join(base, 'docs');

  if (await containsDocFiles(base)) return base;
  if (await existsDirectory(nestedDocs)) return nestedDocs;
  return base;
}
