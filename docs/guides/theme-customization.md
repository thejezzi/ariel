# Theme Customization

The demo includes three built-in themes:

- Midnight
- Dracula
- Tokyo Night

## Theme variables

Core design tokens are CSS variables:

```css
:root {
  --bg: #1b1b1d;
  --surface: #242526;
  --border: #2e2e30;
  --text: #e3e3e3;
  --accent: #25c2a0;
}
```

## Strategy

When adding a new theme:

1. keep spacing + typography identical
2. only swap color tokens
3. test contrast in code blocks and links
