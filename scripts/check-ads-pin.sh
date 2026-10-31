#!/bin/sh
set -eu

target=${1:?target branch required}
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
pin=$(tr -d '[:space:]' < "$script_dir/../ads-pin.txt")
if ! printf '%s' "$pin" | grep -Eq '^[0-9a-f]{40}$'; then
  printf '%s\n' 'FAIL: ads-pin.txt must contain one full lowercase commit SHA' >&2
  exit 1
fi
entry=$(git ls-tree HEAD -- .ads)
expected=$(printf '160000 commit %s\t.ads' "$pin")

if [ -z "$entry" ] && [ "$target" = main ]; then
  printf '%s\n' 'PASS: production candidate omits the ADS gitlink'
elif [ "$entry" = "$expected" ]; then
  printf '%s\n' 'PASS: ADS gitlink matches ads-pin.txt'
else
  printf '%s\n' 'FAIL: ADS gitlink is missing, malformed, or does not match ads-pin.txt' >&2
  exit 1
fi
