#!/bin/sh
set -eu

target=${1:?target branch required}
entry=$(git ls-tree HEAD -- .ads)
expected=$(printf '160000 commit 375fc71f977c40c2053140c34431cc60a6d42883\t.ads')

if [ -z "$entry" ] && [ "$target" = main ]; then
  printf '%s\n' 'PASS: production candidate omits the ADS gitlink'
elif [ "$entry" = "$expected" ]; then
  printf '%s\n' 'PASS: ADS gitlink matches the approved v0.4.2 commit'
else
  printf '%s\n' 'FAIL: ADS gitlink is missing, malformed, or does not match the approved commit' >&2
  exit 1
fi
