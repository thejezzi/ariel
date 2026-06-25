import { describe, expect, it } from 'vitest';
import { annotateBrokenLinks } from './links.js';

const pages = [
  { routePath: 'guides/intro', tableOfContents: [{ id: 'install' }], anchorIds: ['install'] },
  { routePath: 'reference/cli', tableOfContents: [{ id: 'options' }], anchorIds: ['options'] },
];

describe('annotateBrokenLinks', () => {
  it('marks missing page links', () => {
    const page = {
      title: 'Intro',
      routePath: 'guides/intro',
      sourcePath: '/tmp/intro.md',
      html: '<p><a href="/missing/page">Missing</a></p>',
      tableOfContents: [{ depth: 2, text: 'Install', id: 'install' }],
      anchorIds: ['install'],
    };

    const result = annotateBrokenLinks(page, pages);
    expect(result.html).toContain('data-link-status="broken"');
    expect(result.html).toContain('missing-page');
  });

  it('marks missing anchor links', () => {
    const page = {
      title: 'Intro',
      routePath: 'guides/intro',
      sourcePath: '/tmp/intro.md',
      html: '<p><a href="/reference/cli#missing">Missing anchor</a></p>',
      tableOfContents: [{ depth: 2, text: 'Install', id: 'install' }],
      anchorIds: ['install'],
    };

    const result = annotateBrokenLinks(page, pages);
    expect(result.html).toContain('missing-anchor');
  });

  it('does not mark same-page anchor links when anchor exists', () => {
    const page = {
      title: 'Intro',
      routePath: 'guides/intro',
      sourcePath: '/tmp/intro.md',
      html: '<p><a href="#install">Install</a></p>',
      tableOfContents: [{ depth: 2, text: 'Install', id: 'install' }],
      anchorIds: ['install'],
    };

    const result = annotateBrokenLinks(page, pages);
    expect(result.html).not.toContain('data-link-status="broken"');
  });
});
