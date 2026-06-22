const state = { site: null, page: null };

function createTree(nodes, activePath) {
  const ul = document.createElement('ul');
  ul.className = 'tree-list';
  for (const node of nodes) {
    const li = document.createElement('li');
    if (node.kind === 'directory') {
      const label = document.createElement('div');
      label.className = 'tree-folder';
      label.textContent = node.title;
      li.appendChild(label);
      li.appendChild(createTree(node.children || [], activePath));
    } else {
      const a = document.createElement('a');
      a.className = 'tree-file' + (node.routePath === activePath ? ' active' : '');
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

function renderToc(entries) {
  const root = document.getElementById('page-toc');
  root.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'toc-list';
  for (const entry of entries) {
    const li = document.createElement('li');
    li.style.marginLeft = `${(entry.depth - 1) * 12}px`;
    const a = document.createElement('a');
    a.href = `#${entry.id}`;
    a.textContent = entry.text;
    li.appendChild(a);
    ul.appendChild(li);
  }
  root.appendChild(ul);
}

async function renderMermaid() {
  const blocks = document.querySelectorAll('.mermaid');
  if (!blocks.length) return;
  const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  await mermaid.run({ nodes: blocks });
}

async function navigate(routePath, push = true) {
  const response = await fetch('/api/page/' + routePath);
  if (!response.ok) throw new Error('Failed to load page');
  const data = await response.json();
  state.site = data.site;
  state.page = data.page;
  document.getElementById('page-title').textContent = data.page.title;
  document.getElementById('page-path').textContent = data.page.routePath;
  document.getElementById('page-content').innerHTML = data.page.html;
  const sidebar = document.getElementById('sidebar-tree');
  sidebar.innerHTML = '';
  const tree = createTree(data.site.tree, data.page.routePath);
  tree.classList.add('root');
  sidebar.appendChild(tree);
  renderToc(data.page.tableOfContents || []);
  if (push) history.pushState({}, '', '/' + routePath);
  await renderMermaid();
}

window.addEventListener('popstate', () => {
  const route = location.pathname.replace(/^\//, '');
  navigate(route || state.site?.startPage || '', false).catch(console.error);
});

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
