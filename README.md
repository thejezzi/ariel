# docs-renderer

Local documentation renderer for a simple `docs/` folder.

## Features
- Markdown and MDX support
- Mermaid diagrams
- Syntax highlighting
- Sidebar tree from directory structure
- `.order` files for explicit ordering
- Start page resolved from the highest-level `README.md`
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

Examples:
```bash
node dist/cli.js .
node dist/cli.js my/docs/folder
node dist/cli.js my/project/with/docs
```

Pick a port explicitly:
```bash
node dist/cli.js --port 3232
node dist/cli.js my/project/with/docs --port 4567
```

If the requested port is already occupied, the CLI automatically falls back to a free port and tells you which one it chose.

With `npx` from a local repo path later:
```bash
npx /link/to/my/repo
npx /link/to/my/repo my/docs/folder
npx /link/to/my/repo my/project/with/docs --port 3232
```

Directly from GitHub via `prepare`:
```bash
npx --yes github:thejezzi/ariel
npx --yes github:thejezzi/ariel my/project
npx --yes github:thejezzi/ariel ./docs --port 3232
npx --yes github:thejezzi/ariel my/project --port 3232
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
