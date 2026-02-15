#!/usr/bin/env bash
set -euo pipefail

hugo --minify --cleanDestinationDir >/tmp/hugo-build.log

test -f public/resume/index.html
test -f public/tags/index.html
rg -q 'href=/post/api-diff-cli-tool/' public/index.html
test -f public/post/apidiff-cli-tool/index.html
