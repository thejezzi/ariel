const state = { site: null, page: null, searchDocs: [], searchOpen: false, activeSearchQuery: '' };
const THEME_STORAGE_KEY = 'docs-renderer-theme';
const CUSTOM_THEME_CLASSES = ['theme-dracula', 'theme-tokyo-night', 'theme-catppuccin', 'theme-sublime'];
const CUSTOM_DARK_THEMES = ['dracula', 'tokyo-night', 'catppuccin', 'sublime'];
const SHIKI_THEME_KEYS = ['light', 'dark', 'dracula', 'tokyo', 'catppuccin', 'sublime'];

function getThemeRoot() {
  return document.documentElement;
}

function isDarkLikeTheme(theme) {
  if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'dark' || CUSTOM_DARK_THEMES.includes(theme);
}

function getShikiThemeKey(theme) {
  if (theme === 'system') return isDarkLikeTheme(theme) ? 'dark' : 'light';
  if (theme === 'tokyo-night') return 'tokyo';
  if (theme === 'light' || theme === 'dark' || theme === 'dracula' || theme === 'catppuccin' || theme === 'sublime') return theme;
  return 'light';
}

function syncCodeTheme(theme) {
  const shikiTheme = getShikiThemeKey(theme);

  document.querySelectorAll('[data-theme]').forEach((el) => {
    SHIKI_THEME_KEYS.forEach((key) => {
      el.classList.toggle(`shiki-theme-${key}`, key === shikiTheme);
    });
  });
}

function applyTheme(theme) {
  const root = getThemeRoot();
  const select = document.getElementById('theme-select');

  root.dataset.theme = theme;
  root.classList.remove('dark', ...CUSTOM_THEME_CLASSES);

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'system') {
    root.classList.toggle('dark', isDarkLikeTheme(theme));
  } else if (theme !== 'light') {
    if (isDarkLikeTheme(theme)) root.classList.add('dark');
    root.classList.add(`theme-${theme}`);
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  if (select) select.value = theme;
  syncCodeTheme(theme);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const escapedQuery = escapeRegExp(query);
  return escapeHtml(text).replace(new RegExp(`(${escapedQuery})`, 'ig'), '<mark class="search-highlight">$1</mark>');
}

function buildSearchSnippet(doc, query) {
  const lowerBody = doc.bodyText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerBody.indexOf(lowerQuery);
  if (index === -1) return doc.bodyText.slice(0, 160);
  const start = Math.max(0, index - 50);
  const end = Math.min(doc.bodyText.length, index + query.length + 90);
  return `${start > 0 ? '…' : ''}${doc.bodyText.slice(start, end)}${end < doc.bodyText.length ? '…' : ''}`;
}

function scoreSearchDoc(doc, query) {
  const q = query.toLowerCase();
  let score = 0;
  if (doc.title.toLowerCase().startsWith(q)) score += 160;
  else if (doc.title.toLowerCase().includes(q)) score += 100;
  if (doc.routePath.toLowerCase().includes(q)) score += 40;
  if (doc.headings.some((heading) => heading.toLowerCase().startsWith(q))) score += 80;
  else if (doc.headings.some((heading) => heading.toLowerCase().includes(q))) score += 45;
  if (doc.bodyText.toLowerCase().includes(q)) score += 10;
  return score;
}

function findSearchTarget(doc, query) {
  const heading = doc.tableOfContents?.find((entry) => entry.text.toLowerCase().includes(query.toLowerCase()));
  return heading ? `${doc.routePath}#${heading.id}` : doc.routePath;
}

function closeSearch() {
  const overlay = document.getElementById('search-overlay');
  const root = document.getElementById('search-results');
  const input = document.getElementById('search-input');
  if (overlay) overlay.hidden = true;
  if (root) root.innerHTML = '';
  if (input) input.value = '';
  state.searchOpen = false;
}

function getSearchResultButtons() {
  return [...document.querySelectorAll('.search-result')];
}

function setActiveSearchResult(index) {
  const buttons = getSearchResultButtons();
  buttons.forEach((button, currentIndex) => {
    button.classList.toggle('search-result-active', currentIndex === index);
  });
  const active = buttons[index];
  active?.scrollIntoView({ block: 'nearest' });
}

function openSearchResult(button) {
  if (!button) return;
  state.activeSearchQuery = button.dataset.query || '';
  closeSearch();
  navigate(button.dataset.route).catch(console.error);
}

function openSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  if (!overlay || !input) return;
  overlay.hidden = false;
  state.searchOpen = true;
  queueMicrotask(() => input.focus());
}

function runSearch(query) {
  const q = query.trim();
  const root = document.getElementById('search-results');
  if (!root) return;

  if (!q) {
    root.innerHTML = '';
    return;
  }

  const results = state.searchDocs
    .map((doc) => ({ doc, score: scoreSearchDoc(doc, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  if (!results.length) {
    root.innerHTML = '<div class="search-empty">No results</div>';
    return;
  }

  root.innerHTML = results.map(({ doc }) => {
    const targetRoute = findSearchTarget(doc, q);
    return `
      <button type="button" class="search-result" data-route="${targetRoute}" data-query="${escapeHtml(q)}">
        <div class="search-result-title">${highlightText(doc.title, q)}</div>
        <div class="search-result-path">/${escapeHtml(doc.routePath)}</div>
        <div class="search-result-snippet">${highlightText(buildSearchSnippet(doc, q), q)}</div>
      </button>
    `;
  }).join('');

  root.querySelectorAll('[data-route]').forEach((button, index) => {
    button.addEventListener('click', () => openSearchResult(button));
    button.addEventListener('mouseenter', () => setActiveSearchResult(index));
  });

  setActiveSearchResult(0);
}

function positionSearchHighlightButton() {
  const button = document.getElementById('clear-search-highlights');
  if (!button) return;

  const toc = document.querySelector('.app-toc');
  const isDesktopTocVisible = toc && window.innerWidth >= 1280 && getComputedStyle(toc).display !== 'none';

  if (!isDesktopTocVisible) {
    button.style.right = '1.5rem';
    return;
  }

  const rect = toc.getBoundingClientRect();
  const gap = Math.max(window.innerWidth - rect.left, 24);
  button.style.right = `${gap + 24}px`;
}

function setSearchHighlightButtonVisible(visible) {
  const button = document.getElementById('clear-search-highlights');
  if (button) button.hidden = !visible;
  if (visible) positionSearchHighlightButton();
}

function clearSearchHighlights() {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.querySelectorAll('mark.search-highlight-body').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });

  content.normalize();
  state.activeSearchQuery = '';
  setSearchHighlightButtonVisible(false);
}

function highlightSearchMatches() {
  const query = state.activeSearchQuery?.trim();
  if (!query) return;

  clearSearchHighlights();
  state.activeSearchQuery = query;

  const content = document.getElementById('page-content');
  if (!content) return;

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest('script,style,code,pre,mark')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const escapedQuery = escapeRegExp(query);
  const matcher = new RegExp(escapedQuery, 'ig');
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    const text = node.nodeValue;
    if (!text || !matcher.test(text)) continue;
    matcher.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(matcher, (match, offset) => {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      const mark = document.createElement('mark');
      mark.className = 'search-highlight search-highlight-body';
      mark.textContent = match;
      fragment.appendChild(mark);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode.replaceChild(fragment, node);
  }

  const first = content.querySelector('.search-highlight-body');
  if (first && !location.hash) first.scrollIntoView({ block: 'center', behavior: 'auto' });
  setSearchHighlightButtonVisible(Boolean(first));
}

function initSearch() {
  const input = document.getElementById('search-input');
  const trigger = document.getElementById('search-trigger');
  const overlay = document.getElementById('search-overlay');
  if (!input || !trigger || !overlay) return;

  trigger.addEventListener('click', () => openSearch());
  input.addEventListener('input', () => runSearch(input.value));
  input.addEventListener('keydown', (event) => {
    if (!state.searchOpen) return;
    const buttons = getSearchResultButtons();
    if (!buttons.length) return;

    const currentIndex = buttons.findIndex((button) => button.classList.contains('search-result-active'));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSearchResult(Math.min(currentIndex + 1, buttons.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSearchResult(Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      openSearchResult(buttons[Math.max(currentIndex, 0)]);
    }
  });

  document.addEventListener('keydown', (event) => {
    const isShortcut = event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');
    if (isShortcut) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      event.preventDefault();
      openSearch();
      input.select();
      return;
    }

    if (event.key === 'Escape' && state.searchOpen) {
      event.preventDefault();
      closeSearch();
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeSearch();
  });

  document.getElementById('clear-search-highlights')?.addEventListener('click', () => clearSearchHighlights());
  window.addEventListener('resize', () => positionSearchHighlightButton());
  window.addEventListener('scroll', () => positionSearchHighlightButton(), { passive: true });

  fetch('/api/search-index')
    .then((response) => response.json())
    .then((docs) => {
      state.searchDocs = docs;
    })
    .catch(console.error);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  applyTheme(saved);

  document.getElementById('theme-select')?.addEventListener('change', (e) => applyTheme(e.target.value));

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    if (current === 'system') applyTheme('system');
  });
}

function nodeContainsActive(node, activePath) {
  if (node.kind === 'file') return node.routePath === activePath;
  return (node.children || []).some((child) => nodeContainsActive(child, activePath));
}

function createTree(nodes, activePath, depth = 0) {
  const ul = document.createElement('ul');
  ul.className = depth === 0 ? 'sidebar-list-root' : 'sidebar-list-nested';

  for (const node of nodes) {
    const li = document.createElement('li');
    li.className = depth === 0 ? 'sidebar-item-root' : 'sidebar-item-nested';

    if (node.kind === 'directory') {
      const hasActiveChild = nodeContainsActive(node, activePath);
      const details = document.createElement('details');
      details.className = 'sidebar-directory';
      if (hasActiveChild) details.open = true;

      const summary = document.createElement('summary');
      summary.className = hasActiveChild ? 'sidebar-directory-summary sidebar-link-active' : 'sidebar-directory-summary';

      const label = document.createElement('span');
      label.className = 'sidebar-directory-label';
      label.textContent = node.title;

      summary.appendChild(label);
      details.appendChild(summary);
      details.appendChild(createTree(node.children || [], activePath, depth + 1));
      li.appendChild(details);
    } else {
      const a = document.createElement('a');
      const isActive = node.routePath === activePath;
      a.className = isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link';
      a.href = '/' + node.routePath;
      a.textContent = node.title;
      a.addEventListener('click', (event) => {
        event.preventDefault();
        navigate(node.routePath);
      });
      li.appendChild(a);
    }

    ul.appendChild(li);
  }

  return ul;
}

function renderBreadcrumbs(routePath) {
  const root = document.getElementById('breadcrumbs');
  root.innerHTML = '';
  const parts = routePath.split('/');

  parts.forEach((part, index) => {
    const span = document.createElement('span');
    const label = part
      .replace(/\.(md|mdx)$/i, '')
      .replace(/^readme$/i, 'Home')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    span.className = 'breadcrumb-part';
    if (index === parts.length - 1) span.setAttribute('aria-current', 'page');
    span.textContent = label;
    root.appendChild(span);

    if (index < parts.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-separator';
      sep.textContent = '›';
      root.appendChild(sep);
    }
  });
}

let tocObserver = null;
let tocScrollHandler = null;

function setActiveTocLink(id) {
  const links = [...document.querySelectorAll('#page-toc a')];
  links.forEach((link) => link.classList.toggle('toc-link-active', link.dataset.id === id));
}

function scrollToHash(hash) {
  if (!hash) return false;
  const id = hash.replace(/^#/, '');
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView({ block: 'start', behavior: 'auto' });
  setActiveTocLink(id);
  return true;
}

function renderToc(entries) {
  const root = document.getElementById('page-toc');
  root.innerHTML = '';

  const ul = document.createElement('ul');
  ul.className = 'toc-list';

  for (const entry of entries) {
    const li = document.createElement('li');
    li.className = `toc-indent-${Math.min(entry.depth - 1, 5)}`;

    const a = document.createElement('a');
    a.href = `#${entry.id}`;
    a.textContent = entry.text;
    a.dataset.id = entry.id;
    a.className = 'toc-link';
    a.addEventListener('click', (event) => {
      event.preventDefault();
      const hash = `#${entry.id}`;
      const routePath = state.page?.routePath || '';
      history.replaceState(history.state, '', `/${routePath}${hash}`);
      scrollToHash(hash);
    });
    li.appendChild(a);
    ul.appendChild(li);
  }

  root.appendChild(ul);
  setupScrollSpy(entries);
}

function findActiveHeading(entries) {
  const headings = entries
    .map((entry) => ({ entry, el: document.getElementById(entry.id) }))
    .filter((item) => item.el);

  if (headings.length === 0) return null;

  const activationTop = 120;
  const visible = headings
    .map(({ entry, el }) => ({
      entry,
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
    }));

  const lastPassed = visible.filter((item) => item.top <= activationTop).at(-1);
  if (lastPassed) return lastPassed.entry.id;

  return visible[0].entry.id;
}

function setupScrollSpy(entries) {
  if (tocObserver) tocObserver.disconnect();
  if (tocScrollHandler) window.removeEventListener('scroll', tocScrollHandler);

  const update = () => {
    const activeId = findActiveHeading(entries);
    if (activeId) setActiveTocLink(activeId);
  };

  tocObserver = new IntersectionObserver(() => update(), {
    rootMargin: '-120px 0px -60% 0px',
    threshold: [0, 1],
  });

  entries.forEach((entry) => {
    const el = document.getElementById(entry.id);
    if (el) tocObserver.observe(el);
  });

  tocScrollHandler = () => update();
  window.addEventListener('scroll', tocScrollHandler, { passive: true });
  update();
}

let mermaidModulePromise = null;
let mermaidRenderCount = 0;

async function getMermaidModule() {
  mermaidModulePromise ??= import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs').then((module) => module.default);
  return mermaidModulePromise;
}

async function renderMermaid() {
  const blocks = document.querySelectorAll('.mermaid');
  if (!blocks.length) return;
  const mermaid = await getMermaidModule();
  const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  mermaid.initialize({ startOnLoad: false, theme: isDarkLikeTheme(currentTheme) ? 'dark' : 'default', securityLevel: 'loose' });
  await mermaid.run({ nodes: blocks });
}

function ensureMermaidDialog() {
  let dialog = document.getElementById('mermaid-dialog');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.id = 'mermaid-dialog';
  dialog.className = 'mermaid-dialog';
  dialog.innerHTML = `
    <div class="mermaid-dialog-panel">
      <div class="mermaid-dialog-header">
        <div class="mermaid-dialog-title">Diagram</div>
        <div class="mermaid-dialog-controls">
          <button type="button" class="mermaid-zoom-button" data-zoom-action="out" aria-label="Zoom out">−</button>
          <button type="button" class="mermaid-zoom-button" data-zoom-action="reset" aria-label="Reset zoom">Reset</button>
          <button type="button" class="mermaid-zoom-button" data-zoom-action="in" aria-label="Zoom in">+</button>
          <button type="button" class="mermaid-dialog-close" aria-label="Close diagram">Close</button>
        </div>
      </div>
      <div class="mermaid-dialog-body"></div>
    </div>
  `;

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.querySelector('.mermaid-dialog-close')?.addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-zoom-action]').forEach((button) => {
    button.addEventListener('click', () => adjustMermaidZoom(button.getAttribute('data-zoom-action')));
  });

  document.body.appendChild(dialog);
  return dialog;
}

function getMermaidSvgMetrics(block) {
  const svg = block.querySelector('svg');
  if (!svg) return null;

  const viewBox = svg.getAttribute('viewBox')
    ?.trim()
    .split(/\s+/)
    .map(Number);

  const width = viewBox?.[2] || svg.width?.baseVal?.value || svg.getBoundingClientRect().width || 0;
  const height = viewBox?.[3] || svg.height?.baseVal?.value || svg.getBoundingClientRect().height || 0;

  return width > 0 && height > 0 ? { width, height } : null;
}

function setMermaidZoom(clone, zoom) {
  clone.dataset.zoom = String(zoom);
  clone.style.setProperty('--mermaid-zoom', String(zoom));
}

function setMermaidPan(clone, x, y) {
  clone.dataset.panX = String(x);
  clone.dataset.panY = String(y);
  clone.style.setProperty('--mermaid-pan-x', `${x}px`);
  clone.style.setProperty('--mermaid-pan-y', `${y}px`);
}

function adjustMermaidZoom(action) {
  const dialog = document.getElementById('mermaid-dialog');
  const clone = dialog?.querySelector('.mermaid-block-expanded');
  if (!clone) return;

  const currentZoom = Number(clone.dataset.zoom || '1');
  let nextZoom = currentZoom;

  if (action === 'in') nextZoom = Math.min(currentZoom * 1.2, 4);
  if (action === 'out') nextZoom = Math.max(currentZoom / 1.2, 0.4);
  if (action === 'reset') {
    nextZoom = 1;
    setMermaidPan(clone, 0, 0);
  }

  setMermaidZoom(clone, nextZoom);
}

function enlargeMermaidClone(sourceBlock, clone) {
  const sourceMetrics = getMermaidSvgMetrics(sourceBlock);
  const sourceRenderedWidth = sourceBlock.getBoundingClientRect().width || 0;
  const naturalWidth = sourceMetrics?.width || sourceRenderedWidth || 800;

  clone.dataset.baseWidth = String(naturalWidth);
  clone.style.width = `${Math.max(320, naturalWidth)}px`;
  setMermaidZoom(clone, 1);
  setMermaidPan(clone, 0, 0);
}

function setupMermaidPanAndZoom(dialog, clone) {
  const body = dialog.querySelector('.mermaid-dialog-body');
  if (!body || !clone) return;

  body.onwheel = null;
  body.onpointerdown = null;
  body.onpointermove = null;
  body.onpointerup = null;
  body.onpointercancel = null;
  body.style.cursor = 'grab';

  let isDragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;

  body.addEventListener('wheel', (event) => {
    event.preventDefault();
    const currentZoom = Number(clone.dataset.zoom || '1');
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextZoom = Math.min(4, Math.max(0.4, currentZoom * factor));
    setMermaidZoom(clone, nextZoom);
  }, { passive: false });

  body.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startPanX = Number(clone.dataset.panX || '0');
    startPanY = Number(clone.dataset.panY || '0');
    body.style.cursor = 'grabbing';
    body.setPointerCapture?.(pointerId);
  });

  body.addEventListener('pointermove', (event) => {
    if (!isDragging || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    setMermaidPan(clone, startPanX + deltaX, startPanY + deltaY);
  });

  const stopDragging = (event) => {
    if (!isDragging || (pointerId !== null && event.pointerId !== pointerId)) return;
    isDragging = false;
    body.style.cursor = 'grab';
    if (pointerId !== null) body.releasePointerCapture?.(pointerId);
    pointerId = null;
  };

  body.addEventListener('pointerup', stopDragging);
  body.addEventListener('pointercancel', stopDragging);
}

async function renderExpandedMermaid(clone) {
  const source = clone.dataset.mermaidSource;
  if (!source) return false;

  const mermaid = await getMermaidModule();
  const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  mermaid.initialize({ startOnLoad: false, theme: isDarkLikeTheme(currentTheme) ? 'dark' : 'default', securityLevel: 'loose' });

  const renderId = `mermaid-expanded-${++mermaidRenderCount}`;
  const { svg } = await mermaid.render(renderId, source);
  clone.innerHTML = svg;
  return true;
}

async function openMermaidDialog(sourceBlock) {
  const dialog = ensureMermaidDialog();
  const body = dialog.querySelector('.mermaid-dialog-body');
  if (!body) return;

  body.innerHTML = '';
  const clone = sourceBlock.cloneNode(true);
  clone.classList.add('mermaid-block-expanded');
  body.appendChild(clone);

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', 'open');
  }

  const rerendered = await renderExpandedMermaid(clone);
  if (!rerendered) {
    const fallbackSvg = clone.querySelector('svg');
    if (fallbackSvg) {
      fallbackSvg.style.width = '100%';
      fallbackSvg.style.height = 'auto';
      fallbackSvg.style.maxWidth = 'none';
    }
  }

  enlargeMermaidClone(sourceBlock, clone);
  setupMermaidPanAndZoom(dialog, clone);
}

function enhanceMermaidBlocks() {
  document.querySelectorAll('#page-content .mermaid').forEach((block) => {
    if (block.parentElement?.classList.contains('mermaid-inline-wrap')) return;

    block.classList.add('mermaid-block');

    const wrap = document.createElement('div');
    wrap.className = 'mermaid-inline-wrap';

    const actions = document.createElement('div');
    actions.className = 'mermaid-inline-actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mermaid-expand-button';
    button.textContent = 'Expand';
    button.addEventListener('click', () => {
      openMermaidDialog(block).catch(console.error);
    });

    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(actions);
    actions.appendChild(button);
    wrap.appendChild(block);
  });
}

function getCopyIconSvg() {
  return `
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="3" width="8" height="10" rx="2"></rect>
      <path d="M3.5 10.5V5.5A1.5 1.5 0 0 1 5 4"></path>
    </svg>
  `;
}

function getCheckIconSvg() {
  return `
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 5.5"></path>
    </svg>
  `;
}

function setCopyButtonState(button, state) {
  if (state === 'copied') {
    button.innerHTML = getCheckIconSvg();
    button.setAttribute('aria-label', 'Copied');
    return;
  }

  button.innerHTML = getCopyIconSvg();
  button.setAttribute('aria-label', state === 'failed' ? 'Copy failed' : 'Copy code');
}

async function copyCodeFromButton(button) {
  const wrapper = button.closest('.code-block-wrap');
  const code = wrapper?.querySelector('pre code');
  const text = code?.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text.replace(/\n$/, ''));
    button.disabled = true;
    setCopyButtonState(button, 'copied');
    setTimeout(() => {
      setCopyButtonState(button, 'idle');
      button.disabled = false;
    }, 1200);
  } catch {
    button.disabled = true;
    setCopyButtonState(button, 'failed');
    setTimeout(() => {
      setCopyButtonState(button, 'idle');
      button.disabled = false;
    }, 1200);
  }
}

function enhanceCodeBlocks() {
  document.querySelectorAll('#page-content figure[data-rehype-pretty-code-figure]').forEach((figure) => {
    if (figure.parentElement?.classList.contains('code-block-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'code-block-wrap';

    const actions = document.createElement('div');
    actions.className = 'code-block-actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-button';
    setCopyButtonState(button, 'idle');
    button.addEventListener('click', () => copyCodeFromButton(button));

    figure.parentNode.insertBefore(wrap, figure);
    wrap.appendChild(actions);
    actions.appendChild(button);
    wrap.appendChild(figure);
  });
}

function enhanceContent() {
  document.querySelectorAll('#page-content table').forEach((table) => {
    if (table.parentElement?.classList.contains('table-scroll')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  enhanceCodeBlocks();
  enhanceMermaidBlocks();
}

function setPageProcessingToast(visible, message = 'Processing links and page metadata…') {
  const toast = document.getElementById('page-processing-toast');
  if (!toast) return;
  toast.hidden = !visible;
  toast.textContent = message;
}

async function navigate(routePath, push = true) {
  const [rawRoutePath, hash = ''] = routePath.split('#');
  const cleanRoutePath = rawRoutePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const response = await fetch('/api/page/' + cleanRoutePath);
  if (!response.ok) throw new Error('Failed to load page');
  const data = await response.json();
  const resolvedRoutePath = data.resolvedRoutePath || cleanRoutePath;
  state.site = data.site;
  state.page = data.page;
  document.title = `${data.page.title} · Docs`;
  document.getElementById('page-content').innerHTML = data.page.html;

  const sidebar = document.getElementById('sidebar-tree');
  sidebar.innerHTML = '';
  sidebar.appendChild(createTree(data.site.tree, data.page.routePath));

  renderBreadcrumbs(data.page.routePath);
  renderToc(data.page.tableOfContents || []);
  enhanceContent();
  syncCodeTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'system');

  const targetUrl = `/${resolvedRoutePath}${hash ? `#${hash}` : ''}`;
  if (push) history.pushState({}, '', targetUrl);
  await renderMermaid();
  if (!scrollToHash(hash ? `#${hash}` : '')) window.scrollTo(0, 0);
  highlightSearchMatches();

  setPageProcessingToast(true);
  fetch('/api/page-processed/' + cleanRoutePath)
    .then((processedResponse) => processedResponse.ok ? processedResponse.json() : null)
    .then(async (processedData) => {
      if (!processedData || processedData.resolvedRoutePath !== resolvedRoutePath) return;
      if (state.page?.routePath !== resolvedRoutePath) return;
      state.page = processedData.page;
      document.getElementById('page-content').innerHTML = processedData.page.html;
      renderToc(processedData.page.tableOfContents || []);
      enhanceContent();
      syncCodeTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'system');
      await renderMermaid();
      if (!scrollToHash(hash ? `#${hash}` : '')) highlightSearchMatches();
      else highlightSearchMatches();
    })
    .catch(console.error)
    .finally(() => {
      if (state.page?.routePath === resolvedRoutePath) setPageProcessingToast(false);
    });
}

window.addEventListener('popstate', () => {
  const route = `${location.pathname.replace(/^\//, '')}${location.hash}`;
  navigate(route || state.site?.startPage || '', false).catch(console.error);
});

initTheme();
initSearch();

(() => {
  const route = `${location.pathname.replace(/^\//, '').replace(/\/+$/, '')}${location.hash}`;
  navigate(route || 'README', false).catch((error) => {
    document.getElementById('page-content').textContent = error.message;
  });
})();
