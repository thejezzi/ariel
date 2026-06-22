import path from 'node:path';

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function stripExtension(name: string): string {
  return name.replace(/\.(md|mdx)$/i, '');
}

export function titleFromName(name: string): string {
  const base = stripExtension(name);
  if (/^readme$/i.test(base)) return 'README';
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isDocFile(name: string): name is `${string}.md` | `${string}.mdx` {
  return /\.(md|mdx)$/i.test(name);
}

export function routeFromRelativePath(relativePath: string): string {
  const posix = toPosixPath(relativePath);
  return posix.replace(/\.(md|mdx)$/i, '');
}
