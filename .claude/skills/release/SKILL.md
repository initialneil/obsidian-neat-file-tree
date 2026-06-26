---
name: release
description: "Ship a new Neat File Tree version — publish to GitHub + refresh the local Obsidian install. Use when the user types /release in this repo or asks to cut/ship a new plugin version."
argument-hint: "[patch|minor|major | X.Y.Z] [\"changelog note\"]"
---

# /release — ship a new Neat File Tree version

Publishes a new version of the plugin: bumps the version, tags, pushes, cuts the GitHub release
with the plugin assets, and refreshes the local vault install. Distilled from the global
`release-skill` recipe, **adapted to Obsidian community-plugin rules** (bare tags, individual assets).

## Run
1. `cd` to the repo root.
2. Preflight: `git status` clean, on `main`. Echo `releasing <cur> → <next> — <note>`.
   **Typing /release IS the go-ahead — don't re-prompt.**
3. `scripts/publish.sh <bump> "<note>"` — `<bump>` = `patch` | `minor` | `major` | `X.Y.Z` (default `patch`).
4. Report the new version + release URL.

## Bump map
- **major** = breaking / big user-facing change → first number.
- **minor** = a feature or new setting → middle number.
- **patch** = a fix → last number. **Default.**
- An explicit `X.Y.Z` is accepted. The note becomes the GitHub release body; if omitted,
  summarize what changed since the last tag (don't invent).

## Obsidian community-store rules (publish.sh enforces — never break)
- Tag == manifest `version`, **no `v` prefix** (the store matches the bare version).
- The release attaches `main.js`, `manifest.json`, `styles.css` as **individual assets** — never a zip.
- `versions.json` gets the new `"version": "minAppVersion"` entry.
- **Never** change `id` in `manifest.json`.
- After the first directory acceptance, new releases **auto-detect** — no second `obsidian-releases` PR.

## Guardrails
- Only on an explicit `/release` (it pushes a public tag) — never speculative.
- Plugin code only (`main.js` / `styles.css` / `manifest.json`); README / tooling edits are a plain commit.
- If `publish.sh` fails (push rejected, tag exists, bad version) **STOP and report** — never force-push or re-tag.
- Local install refresh runs `./dev-sync.sh` (gitignored, machine-specific) — best effort; release still
  proceeds if Obsidian is closed.
