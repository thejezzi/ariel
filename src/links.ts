import { PageData } from './types.js';

const NON_DOC_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

export interface LinkablePage {
  routePath: string;
  tableOfContents: Array<{ id: string }>;
  anchorIds?: string[];
}

function normalizeHash(hash: string): string {
  try {
    return decodeURIComponent(hash).trim();
  } catch {
    return hash.trim();
  }
}

function resolveHrefTarget(href: string, currentRoutePath: string): { routePath: string; hash: string } | null {
  const trimmed = href.trim();
  if (!trimmed || NON_DOC_SCHEME_RE.test(trimmed) || trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('#')) return { routePath: currentRoutePath, hash: normalizeHash(trimmed.slice(1)) };
  const [pathPart, hash = ''] = trimmed.split('#');
  if (!pathPart.startsWith('/')) return null;
  return { routePath: pathPart.replace(/^\/+/, '').replace(/\/+$/, ''), hash: normalizeHash(hash) };
}

export function annotateBrokenLinks(page: PageData, pages: LinkablePage[]): PageData {
  const pageMap = new Map(pages.map((item) => [item.routePath, item]));

  const html = page.html.replace(/<a([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (match, before: string, href: string, after: string, inner: string) => {
    const target = resolveHrefTarget(href, page.routePath);
    if (!target) return match;

    const targetPage = pageMap.get(target.routePath);
    let error = '';

    if (!targetPage) {
      error = 'missing-page';
    } else if (target.hash) {
      const knownAnchorIds = targetPage.anchorIds?.length ? targetPage.anchorIds : targetPage.tableOfContents.map((entry) => entry.id);
      const hasAnchor = knownAnchorIds.some((id) => normalizeHash(id) === target.hash);
      if (!hasAnchor) error = 'missing-anchor';
    }

    if (!error) return match;

    return `<a${before}href="${href}"${after} data-link-status="broken" data-link-error="${error}" title="Broken link: ${error.replace(/-/g, ' ')}">${inner}<span class="broken-link-indicator" aria-label="Broken link">⚠</span></a>`;
  });

  return { ...page, html };
}
