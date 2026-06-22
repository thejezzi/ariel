# PLAN

## Goal
Build a local docs renderer CLI that serves a documentation folder with:
- Markdown + MDX rendering
- Mermaid diagrams
- Syntax highlighting
- Sidebar tree from directory structure
- `.order` file support for explicit ordering
- Start page = highest-level `README.md`
- CLI starts webserver and opens browser
- CLI can be invoked directly as `docs-renderer [path]` and later via `npx /path/to/repo [path]`
- If the given path is a project root containing `docs/`, auto-use that nested folder
- GitHub execution should work through an npm `prepare` build
- CLI path resolution should use the caller working directory, not the temporary npx install directory
- If the preferred port is occupied, auto-fallback to a free port to avoid confusing behavior during repeated npx runs

## Proposed stack
- TypeScript
- Node.js CLI with Commander
- Express server
- Lightweight browser client (plain JS/CSS) instead of React/Vite for simplicity
- MDX rendering with `@mdx-js/mdx` / `@mdx-js/react`
- Markdown plugins via unified/remark/rehype
- Mermaid client rendering
- Syntax highlighting via `rehype-pretty-code`
- Vitest for unit tests

## Phases
1. Scaffold project and CLI
2. Implement docs tree discovery and `.order` sorting
3. Implement markdown/MDX compilation pipeline
4. Build frontend reader with sidebar + routing
5. Add Mermaid + syntax highlighting
6. Wire CLI server startup and browser opening
7. Add tests and docs
8. Validate with build/test

## Notes
- Architecture simplified from React/Vite UI to a plain browser client because the feature set does not require a SPA framework.
- Server compiles Markdown/MDX to HTML and exposes JSON endpoints for site tree + page content.
- CLI now only supports direct positional invocation, defaults to port 3232, auto-detects `./docs` when run from a project root, and builds automatically when installed from GitHub.
- Update this plan during implementation if architecture changes.
