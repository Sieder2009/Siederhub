#!/usr/bin/env bash
# Baut das komplette GitHub-Pages-Verzeichnis zusammen — im Workflow
# (.github/workflows/pages.yml) genauso wie lokal:
#
#   /                      GYM STATS: alle eingecheckten Dateien aus dem Repo-Root
#   /portfolio/            Portfolio: fertiger Vite-Build aus portfolio/dist
#   /projects/blockblast/  Block Blast: Flutter-Web-Build (optional, 2. Argument)
#
#   bash .github/scripts/assemble-site.sh <ziel> [pfad/zu/blockblast/build/web]
set -euo pipefail

out="${1:-_site}"
blockblast_web="${2:-}"

case "$out" in
  "" | "." | ".." | "/") echo "Ungültiges Ziel: '$out'" >&2; exit 1 ;;
esac

cd "$(git rev-parse --show-toplevel)"
if [ ! -f portfolio/dist/index.html ]; then
  echo "portfolio/dist fehlt — zuerst in portfolio/ 'npm run build' ausführen" >&2
  exit 1
fi

rm -rf "$out"
mkdir -p "$out"

# GYM STATS so, wie Pages es bisher direkt aus dem Branch ausgeliefert hat:
# alles Eingecheckte — außer dem Portfolio-Quellcode (kommt gebaut dazu)
# und Repo-Interna. Neue Seiten im Root landen damit automatisch online.
git ls-files -z -- . \
  ':(exclude)portfolio' ':(exclude).github' \
  ':(exclude).gitignore' ':(exclude).gitattributes' ':(exclude)README.md' \
  | xargs -0 cp --parents -t "$out"

cp -r portfolio/dist "$out/portfolio"

if [ -n "$blockblast_web" ]; then
  mkdir -p "$out/projects"
  cp -r "$blockblast_web" "$out/projects/blockblast"
fi

echo "Seite zusammengebaut: $out/ ($(find "$out" -type f | wc -l | tr -d ' ') Dateien)"
