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

# Exercise Giscus with fixture IDs, without contacting GitHub.
mkdir -p "$output/content/post"
cat > "$output/content/post/comments-enabled.md" <<'EOF'
---
title: Comments enabled
---
Post with comments.
EOF
cat > "$output/content/post/comments-disabled.md" <<'EOF'
---
title: Comments disabled
comments: false
---
Post without comments.
EOF
cat > "$output/giscus.toml" <<'EOF'
[Params.giscus]
repo = "example/comments"
repoId = "fixture-repo"
category = "Announcements"
categoryId = "fixture-category"
EOF
hugo --panicOnWarning --config "config.toml,$output/giscus.toml" --contentDir "$output/content" --destination "$output/configured"
enabled="$output/configured/post/comments-enabled/index.html"
rg -q 'src="https://giscus.app/client.js"' "$enabled"
rg -q 'data-repo-id="fixture-repo"' "$enabled"
rg -q 'data-category-id="fixture-category"' "$enabled"
rg -q 'data-mapping="pathname"' "$enabled"
for page in "$output/configured/post/comments-disabled/index.html" "$output/configured/index.html" "$output/configured/post/index.html"; do
  if rg -q 'giscus.app/client.js|id="comments-title"' "$page"; then
    echo "Unexpected comments on $page"
    exit 1
  fi
done
cat > "$output/giscus.toml" <<'EOF'
[Params.giscus]
categoryId = ""
EOF
hugo --panicOnWarning --config "config.toml,$output/giscus.toml" --contentDir "$output/content" --destination "$output/unconfigured"
if rg -q 'giscus.app/client.js|id="comments-title"' "$output/unconfigured/post/comments-enabled/index.html"; then
  echo "Unexpected comments with incomplete configuration."
  exit 1
fi
echo "Post layout checks passed."
