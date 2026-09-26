#!/bin/bash
set -e
cd "$(dirname "$0")"
unset ELECTRON_RUN_AS_NODE
runtime="node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
if [ ! -x "$runtime" ]; then
  echo '请先在项目目录执行 npm ci 安装依赖。'
  exit 1
fi
exec "$runtime" .
