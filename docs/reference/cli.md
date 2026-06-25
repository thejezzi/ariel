# CLI Reference

## Basic usage

```bash
docs-renderer [path]
```

## Options

| option | description |
|---|---|
| `--port <n>` | preferred server port |
| `--no-open` | don't auto-open browser |

## Examples

```bash
docs-renderer

docs-renderer ./docs --port 3232

docs-renderer my-project --port 4567
```

## Notes

- Directory routes fall back to the first page in that directory.
- Internal broken links are marked inline in rendered docs.
- Search can be opened with `/` or `Cmd/Ctrl+K`.
