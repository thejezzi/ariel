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

With `npx` from a local repo path later:
```bash
npx /link/to/my/repo
npx /link/to/my/repo my/docs/folder
npx /link/to/my/repo my/project/with/docs --port 3232
```

Directly from GitHub via `prepare`:
```bash
npx --yes git+https://github.com/YOUR_USER/YOUR_REPO.git
npx --yes git+https://github.com/YOUR_USER/YOUR_REPO.git my/project
npx --yes git+https://github.com/YOUR_USER/YOUR_REPO.git my/project --port 3232
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
- published/git-installed package contents are limited to the files needed to run the CLI
