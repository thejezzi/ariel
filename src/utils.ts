import path from 'node:path';

const NON_DOC_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

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

export function normalizeDocHref(href: string, currentRoutePath: string): string {
  const trimmed = href.trim();
  if (!trimmed || NON_DOC_SCHEME_RE.test(trimmed) || trimmed.startsWith('//')) return href;
  if (trimmed.startsWith('#')) return trimmed;

  const [pathPart, hash = ''] = trimmed.split('#');
  const hashSuffix = hash ? `#${hash}` : '';

  if (/\.(md|mdx)$/i.test(pathPart)) {
    if (pathPart.startsWith('/')) {
      return `/${routeFromRelativePath(pathPart.replace(/^\/+/, ''))}${hashSuffix}`;
    }

    const currentDir = path.posix.dirname(toPosixPath(currentRoutePath));
    const resolved = path.posix.normalize(path.posix.join(currentDir === '.' ? '' : currentDir, pathPart));
    return `/${routeFromRelativePath(resolved)}${hashSuffix}`;
  }

  return href;
}
