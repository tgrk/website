#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Building site"
hugo --panicOnWarning --minify >/tmp/hugo-prepublish.out

echo "[2/5] Checking missing post covers"
if rg -n "cover:\s*['\"]?/img/cover\.jpg" content/post/*.md >/tmp/missing-covers.out; then
  cat /tmp/missing-covers.out
  echo "ERROR: Found missing cover references"
  exit 1
fi

echo "[3/5] Checking missing project media"
if rg -n "/media/(hex|github)\.png" data/gallery.yml data/projects.yml >/tmp/missing-project-media.out; then
  cat /tmp/missing-project-media.out
  echo "ERROR: Found missing project media references"
  exit 1
fi

echo "[4/5] Checking critical pages render content"
for page in public/index.html public/post/index.html public/projects/index.html public/resume/index.html public/privacy/index.html public/imprint/index.html; do
  if [[ ! -s "$page" ]]; then
    echo "ERROR: Missing generated page: $page"
    exit 1
  fi
done

if ! rg -q "Erlpocket" public/projects/index.html; then
  echo "ERROR: /projects/ page appears empty"
  exit 1
fi

if ! rg -q "featured|APIDiff CLI Tool|Talk for Pyladies" public/index.html; then
  echo "ERROR: Homepage featured writing section appears missing"
  exit 1
fi

echo "[5/5] Checking metadata formatting"
if rg -n "content=\"\[.*\]\"|https://www.wiso.cz//" public/index.html public/post/index.html public/projects/index.html >/tmp/meta-errors.out; then
  cat /tmp/meta-errors.out
  echo "ERROR: Metadata formatting issue detected"
  exit 1
fi

echo "All prepublish checks passed."
