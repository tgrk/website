#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
output=$(mktemp -d)
hugo --panicOnWarning --destination "$output"

covered="$output/post/code-beam-sto-2018-notes/index.html"
plain="$output/post/hello-world/index.html"
rg -q 'class="post-cover"' "$covered"
rg -q 'href="/tags/erlang/"' "$covered"
if rg -q 'class="post-cover"|class="post-tags"' "$plain"; then
  echo "Unexpected cover or topics on the plain post."
  exit 1
fi
for page in "$covered" "$plain"; do
  rg -q '<main class="post-page"' "$page"
  rg -q '<time datetime="' "$page"
  rg -q 'href="/post/"' "$page"
  rg -q 'class="content post-body"' "$page"
done
rg -q 'id="disqus_thread"' "$covered"
rg -q '"wiso".*\.disqus.com/embed.js' "$covered"
if rg -q 'disqus.com/embed.js' "$output/index.html"; then
  echo "Unexpected comments on the homepage."
  exit 1
fi
echo "Post layout checks passed."
