# Markdown Reference

Ariel renders standard CommonMark plus GitHub Flavored Markdown. This page
shows the link styles that are supported and how to author them so they
render as real links instead of literal text.

## Inline links

The simplest form — URL lives directly inside the link:

```md
See the [CLI reference](./cli.md) for all flags.
```

Renders as: See the [CLI reference](./cli.md) for all flags.

## Reference links

Reference links keep the URL out of the prose by defining it once at the
bottom of the page and referring to it by label elsewhere. This is handy for
repeated links and keeps paragraphs readable.

### Recommended: separate the definition with a blank line

A link reference definition must be its own block. Put a **blank line**
between the prose and the definition — this is the CommonMark-spec-compliant
way and always renders correctly:

````md
```md
The endpoint is documented at [send_all_offers][1].

[1]: https://example.com/api/send_all_offers
```
````

The same pattern, rendered live on this page:

The endpoint is documented at [send_all_offers][1].

[1]: https://example.com/api/send_all_offers

### Shortcut form

You can drop the second bracket and use the label text itself as the
reference:

```md
See [send_all_offers] for details.

[send_all_offers]: https://example.com/api/send_all_offers
```

Rendered live:

See [send_all_offers] for details.

[send_all_offers]: https://example.com/api/send_all_offers

### Collapsed form

A trailing empty pair of brackets also works:

```md
See [send_all_offers][] for details.

[send_all_offers]: https://example.com/api/send_all_offers
```

### Titles

Optional titles become hover tooltips:

```md
See [send_all_offers][1] for details.

[1]: https://example.com/api/send_all_offers "POST /send_all_offers"
```

Rendered live:

See [send_all_offers][2] for details.

[2]: https://example.com/api/send_all_offers "POST /send_all_offers"

## Common pitfall: definition glued to a paragraph

If the definition sits directly under a paragraph **without a blank line**,
strict CommonMark treats it as part of that paragraph and the reference link
is left as literal text:

```md
See [send_all_offers][1] for details.
[1]: https://example.com/api/send_all_offers
```

Ariel is lenient here and inserts the missing separation automatically, so
the link below still renders — but for portability across other renderers,
prefer the blank-line form shown above:

See [send_all_offers][3] for details.
[3]: https://example.com/api/send_all_offers

## Autolinks

Bare URLs and email addresses in angle brackets become links:

```md
<https://example.com>
```

Rendered live: <https://example.com>
