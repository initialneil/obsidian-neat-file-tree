# Neat File Tree

Small quality-of-life tweaks for Obsidian's file explorer that make a deep, busy
vault easier to navigate.

<p align="center">
  <img src="assets/demo.jpg" alt="Neat File Tree — sticky folder headers, shown across the six color schemes">
</p>

<p align="center"><sub>Sticky folder headers + the six built-in color schemes (Aurora, Rainbow, Ocean, Sunset, Forest, Mono)</sub></p>

## Features

- **Sticky folder headers** — parent folders pin to the top as you scroll,
  stacked by depth, just like VSCode's "sticky scroll". You never lose track of
  where you are when many folders are expanded.
- **Per-depth color schemes** — folder names, their bar, and the indentation
  guide lines are colored by depth from a scheme you pick: **Aurora** (the
  default, anchored to your theme's accent), **Rainbow**, **Ocean**, **Sunset**,
  **Forest**, or **Mono** — chosen from a live preview in settings. Top-level
  folders stay bold so the roots of your vault stand out.

Each feature has its own toggle in the plugin settings, plus a **Row height**
field to keep the sticky headers aligned if you use a larger interface font.

## Install

In Obsidian: Settings → Community plugins → Browse → search "Neat File Tree" →
Install → Enable.

## How it works

The plugin is pure CSS toggled by body classes — no DOM manipulation, no
performance cost. It respects your theme's accent color (`--text-accent`) and
background variables, so it adapts to light/dark and custom themes
automatically.

## License

MIT
