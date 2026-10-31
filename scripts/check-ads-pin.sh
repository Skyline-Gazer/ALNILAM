#!/bin/sh
set -eu

target=${1:?target branch required}
entry=$(git ls-tree HEAD -- .ads)
expected=$(printf '160000 commit 6e5a7dfd1b717a03ed5b33c66707f47aab7f76b9\t.ads')

if [ -z "$entry" ] && [ "$target" = main ]; then
  printf '%s\n' 'PASS: production candidate omits the ADS gitlink'
elif [ "$entry" = "$expected" ]; then
  printf '%s\n' 'PASS: ADS gitlink matches the approved cnb/dev commit'
else
  printf '%s\n' 'FAIL: ADS gitlink is missing, malformed, or does not match the approved commit' >&2
  exit 1
fi
