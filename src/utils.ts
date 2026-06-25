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

function resolveRouteRelativePath(targetPath: string, currentRoutePath: string): string {
  if (targetPath.startsWith('/')) return targetPath.replace(/^\/+/, '');
  const currentDir = path.posix.dirname(toPosixPath(currentRoutePath));
  return path.posix.normalize(path.posix.join(currentDir === '.' ? '' : currentDir, targetPath));
}

export function normalizeDocHref(href: string, currentRoutePath: string): string {
  const trimmed = href.trim();
  if (!trimmed || NON_DOC_SCHEME_RE.test(trimmed) || trimmed.startsWith('//')) return href;
  if (trimmed.startsWith('#')) return trimmed;

  const [pathPart, hash = ''] = trimmed.split('#');
  const hashSuffix = hash ? `#${hash}` : '';

  if (/\.(md|mdx)$/i.test(pathPart)) {
    const resolved = resolveRouteRelativePath(pathPart, currentRoutePath);
    return `/${routeFromRelativePath(resolved)}${hashSuffix}`;
  }

  return href;
}

export function normalizeAssetSrc(src: string, currentRoutePath: string): string {
  const trimmed = src.trim();
  if (!trimmed || NON_DOC_SCHEME_RE.test(trimmed) || trimmed.startsWith('//') || trimmed.startsWith('#')) return src;

  const [pathPart, hash = ''] = trimmed.split('#');
  const resolved = resolveRouteRelativePath(pathPart, currentRoutePath);
  const hashSuffix = hash ? `#${hash}` : '';
  return `/docs-assets/${resolved}${hashSuffix}`;
}
