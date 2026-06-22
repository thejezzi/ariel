const state = { site: null, page: null };
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

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
  applyTheme(saved);

  document.getElementById('theme-select')?.addEventListener('change', (e) => applyTheme(e.target.value));

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    if (current === 'system') applyTheme('system');
  });
}

function createTree(nodes, activePath, depth = 0) {
  const ul = document.createElement('ul');
  ul.className = depth === 0 ? 'sidebar-list-root' : 'sidebar-list-nested';

  for (const node of nodes) {
    const li = document.createElement('li');

    if (node.kind === 'directory') {
      const label = document.createElement('div');
      label.className = 'sidebar-section-label';
      label.textContent = node.title;
      li.appendChild(label);
      li.appendChild(createTree(node.children || [], activePath, depth + 1));
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

async function renderMermaid() {
  const blocks = document.querySelectorAll('.mermaid');
  if (!blocks.length) return;
  const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
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
  const baseWidth = Number(clone.dataset.baseWidth || '0');
  const svg = clone.querySelector('svg');
  if (!svg || !baseWidth) return;

  clone.dataset.zoom = String(zoom);
  const targetWidth = Math.max(320, Math.round(baseWidth * zoom));
  clone.style.width = `${targetWidth}px`;
  svg.style.width = `${targetWidth}px`;
  svg.style.maxWidth = 'none';
  svg.style.height = 'auto';
}

function adjustMermaidZoom(action) {
  const dialog = document.getElementById('mermaid-dialog');
  const clone = dialog?.querySelector('.mermaid-block-expanded');
  if (!clone) return;

  const currentZoom = Number(clone.dataset.zoom || '1');
  let nextZoom = currentZoom;

  if (action === 'in') nextZoom = Math.min(currentZoom * 1.2, 4);
  if (action === 'out') nextZoom = Math.max(currentZoom / 1.2, 0.4);
  if (action === 'reset') nextZoom = 1;

  setMermaidZoom(clone, nextZoom);
}

function enlargeMermaidClone(sourceBlock, clone) {
  const sourceMetrics = getMermaidSvgMetrics(sourceBlock);
  const sourceRenderedWidth = sourceBlock.getBoundingClientRect().width || 0;
  const dialogTargetWidth = Math.max(window.innerWidth * 0.82, sourceRenderedWidth * 1.7);
  const naturalWidth = sourceMetrics?.width || sourceRenderedWidth || 800;
  const baseWidth = Math.max(naturalWidth, dialogTargetWidth);

  clone.dataset.baseWidth = String(baseWidth);
  setMermaidZoom(clone, 1);
}

function openMermaidDialog(sourceBlock) {
  const dialog = ensureMermaidDialog();
  const body = dialog.querySelector('.mermaid-dialog-body');
  if (!body) return;

  body.innerHTML = '';
  const clone = sourceBlock.cloneNode(true);
  clone.classList.add('mermaid-block-expanded');
  body.appendChild(clone);
  enlargeMermaidClone(sourceBlock, clone);

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', 'open');
  }
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
    button.addEventListener('click', () => openMermaidDialog(block));

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

async function navigate(routePath, push = true) {
  const response = await fetch('/api/page/' + routePath);
  if (!response.ok) throw new Error('Failed to load page');
  const data = await response.json();
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

  if (push) history.pushState({}, '', '/' + routePath);
  window.scrollTo(0, 0);
  await renderMermaid();
}

window.addEventListener('popstate', () => {
  const route = location.pathname.replace(/^\//, '');
  navigate(route || state.site?.startPage || '', false).catch(console.error);
});

initTheme();

fetch('/api/site')
  .then((response) => response.json())
  .then((site) => {
    state.site = site;
    const route = location.pathname.replace(/^\//, '') || site.startPage;
    return navigate(route, false);
  })
  .catch((error) => {
    document.getElementById('page-content').textContent = error.message;
  });
