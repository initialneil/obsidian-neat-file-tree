#!/bin/sh
# Deterministic publisher for the Neat File Tree Obsidian plugin.
#   scripts/publish.sh [patch|minor|major|X.Y.Z] ["changelog note"]
# Obsidian rules baked in: bare tag (no v), assets attached individually, versions.json updated.
set -eu
cd "$(dirname "$0")/.."

BUMP="${1:-patch}"
NOTE="${2:-}"

CUR=$(perl -ne 'print $1 and exit if /"version"\s*:\s*"([0-9]+\.[0-9]+\.[0-9]+)"/' manifest.json)
[ -n "$CUR" ] || { echo "could not read version from manifest.json" >&2; exit 1; }

case "$BUMP" in
  major) NEXT=$(echo "$CUR" | awk -F. '{print ($1+1)".0.0"}') ;;
  minor) NEXT=$(echo "$CUR" | awk -F. '{print $1"."($2+1)".0"}') ;;
  patch) NEXT=$(echo "$CUR" | awk -F. '{print $1"."$2"."($3+1)}') ;;
  [0-9]*.[0-9]*.[0-9]*) NEXT="$BUMP" ;;
  *) echo "bump must be major|minor|patch|X.Y.Z (got: $BUMP)" >&2; exit 1 ;;
esac

MINAPP=$(perl -ne 'print $1 and exit if /"minAppVersion"\s*:\s*"([0-9.]+)"/' manifest.json)

echo "releasing $CUR -> $NEXT  (minAppVersion $MINAPP)"

# perl -0pi (not sed -i): uniform on macOS + Linux
perl -0pi -e "s/(\"version\"\\s*:\\s*\")[0-9.]+(\")/\${1}$NEXT\${2}/" manifest.json
grep -q "\"$NEXT\"" versions.json || perl -0pi -e "s/\\n\\}/,\\n  \"$NEXT\": \"$MINAPP\"\\n}/" versions.json

# refresh the local vault install (gitignored, machine-specific) — best effort
if [ -x ./dev-sync.sh ]; then ./dev-sync.sh || echo "  ! dev-sync failed (Obsidian closed?) — continuing"; fi

git add manifest.json versions.json
git commit -m "$NEXT"
git tag "$NEXT"                       # bare tag — Obsidian matches manifest version, no 'v'
git push origin HEAD --tags

if command -v gh >/dev/null 2>&1; then
  gh release create "$NEXT" main.js manifest.json styles.css \
     --title "$NEXT" --notes "${NOTE:-Release $NEXT}"
  echo "released $NEXT -> $(gh release view "$NEXT" --json url --jq .url 2>/dev/null || echo ok)"
else
  echo "released $NEXT (tag pushed; gh not found — create the GitHub release manually with the 3 assets)"
fi
