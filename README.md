# docs-renderer

Local documentation renderer for a simple `docs/` folder.

## Features
- Markdown and MDX support
- Mermaid diagrams
- Syntax highlighting
- Sidebar tree from directory structure
- `.order` files for explicit ordering
- Start page resolved from the highest-level `README.md`
- Local full-text search with keyboard shortcuts
- GitHub-style admonitions such as `> [!NOTE]`
- Broken internal link warnings with inline indicators
- CLI starts a local webserver and opens the browser

## Install
```bash
npm install
```

## Use
If your current folder contains `./docs`, just run:
```bash
npm run build
node dist/cli.js
```

You can also point it at either:
- a docs folder directly, or
- a project folder that contains `docs/`
- a single `.md` / `.mdx` file (single-file mode renders only that file)

Examples:
```bash
node dist/cli.js .
node dist/cli.js my/docs/folder
node dist/cli.js my/project/with/docs
node dist/cli.js docs/guides/install.md   # single-file mode
```

In single-file mode the nearest `docs/` ancestor is used as the docs directory,
so the file's natural route is preserved (e.g. `docs/guides/install.md` is served
at `/guides/install`). If no `docs/` ancestor exists, the file's parent folder
becomes the docs directory and the route is the file basename.

Only `.md` and `.mdx` files are supported in single-file mode; other files exit
with a clear error.

Pick a port explicitly:
```bash
node dist/cli.js --port 3232
node dist/cli.js my/project/with/docs --port 4567
node dist/cli.js docs/guides/install.md --port 4567
```

If the requested port is already occupied, the CLI automatically falls back to a free port and tells you which one it chose.

With `npx` from a local repo path later:
```bash
npx /link/to/my/repo
npx /link/to/my/repo my/docs/folder
npx /link/to/my/repo my/project/with/docs --port 3232
npx /link/to/my/repo docs/guides/install.md
```

Directly from GitHub via `prepare`:
```bash
npx --yes github:thejezzi/ariel
npx --yes github:thejezzi/ariel my/project
npx --yes github:thejezzi/ariel ./docs --port 3232
npx --yes github:thejezzi/ariel my/project --port 3232
npx --yes github:thejezzi/ariel docs/guides/install.md
```

Or during development:
```bash
npm run dev
```

## Docs structure
- Any `.md` or `.mdx` file becomes a route
- Directories become sidebar sections
- Add a `.order` file in any directory to control file/folder order
- Frontmatter `title` overrides the generated page title
- Internal links to missing pages or missing heading anchors are marked inline
- GitHub-style admonitions are supported

Admonition example:

```md
> [!NOTE]
> This note renders as a styled callout.
```

Example `.order`:
```txt
README.md
guides
api.mdx
```

## Development
```bash
npm test
npm run build
```

## Playwright MCP
Installed locally:
```bash
npm run mcp:playwright
```

It exposes an MCP endpoint at:
```txt
http://localhost:8931/mcp
```

Example client config is in:
```txt
MCP.playwright.example.json
```

## Global-ish local execution
After building, you can also use:
```bash
npm link
docs-renderer
docs-renderer my/docs/folder
docs-renderer my/project/with/docs --port 3232
```

## Packaging notes
- `prepare` runs the build automatically when installed from GitHub
- path resolution is based on the caller directory (`INIT_CWD`), so `npx` from GitHub/local packages uses your working directory, not the temporary install directory
- if the requested port is already busy, the CLI automatically switches to a free port instead of failing or accidentally talking to another already-running instance
- published/git-installed package contents are limited to the files needed to run the CLI
