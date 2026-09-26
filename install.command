#!/bin/bash
set -e
base="$(cd "$(dirname "$0")" && pwd)"
runtime="$base/desktop/Epassword.app/Contents/MacOS/Epassword"
if [ -x "$runtime" ]; then
  ELECTRON_RUN_AS_NODE=1 "$runtime" "$base/scripts/install.cjs" "$@"
else
  unset ELECTRON_RUN_AS_NODE
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js 24 is required for source installation. Use the Setup ZIP to install without Node.js."
    exit 1
  fi
  node "$base/scripts/install.cjs" "$@"
fi
