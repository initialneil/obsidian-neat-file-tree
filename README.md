# Neat File Tree

Small quality-of-life tweaks for Obsidian's file explorer that make a deep, busy
vault easier to navigate.

> Add a `demo.png` / `demo.gif` screenshot here before publishing.

## Features

- **Sticky folder headers** — parent folders pin to the top as you scroll,
  stacked by depth, just like VSCode's "sticky scroll". You never lose track of
  where you are when many folders are expanded.
- **Accent top-level folders** — top-level folders are shown in your accent
  color and bold so the roots of your vault stand out.
- **Accent indentation guides** — the tree's indent guide lines are tinted to
  match your accent color.

Each feature has its own toggle in the plugin settings, plus a **Row height**
field to keep the sticky headers aligned if you use a larger interface font.

## Install

### From Community Plugins (once approved)

Settings → Community plugins → Browse → search "Neat File Tree" → Install →
Enable.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest
   [release](../../releases).
2. Copy them into `<your-vault>/.obsidian/plugins/neat-file-tree/`.
3. Reload Obsidian and enable the plugin in Settings → Community plugins.

## How it works

The plugin is pure CSS toggled by body classes — no DOM manipulation, no
performance cost. It respects your theme's accent color (`--text-accent`) and
background variables, so it adapts to light/dark and custom themes
automatically.

## License

MIT
