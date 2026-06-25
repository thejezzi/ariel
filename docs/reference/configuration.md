# Configuration Reference

## `.order` file

Controls ordering in each directory.

- one filename or folder name per line
- `#` for comments
- unspecified entries follow alphabetically

## Theme persistence

Selected theme is stored in browser localStorage.

| key | description |
|---|---|
| `docs-renderer-theme` | currently selected UI theme |

## Search

Ariel exposes a local search index to the browser and supports:

- click-to-open centered search UI
- `/` keyboard shortcut
- `Cmd/Ctrl+K` keyboard shortcut
- result highlighting in titles and snippets
- persistent in-page highlights until manually cleared

## Admonitions

GitHub-style admonitions are supported.

Example:

```md
> [!NOTE]
> This is a note.
```

Supported callout types:

- `NOTE`
- `TIP`
- `IMPORTANT`
- `WARNING`
- `CAUTION`

## Broken links

Internal links are validated against local pages and heading anchors.

When a target page or anchor is missing, Ariel renders an inline warning indicator next to the link.
