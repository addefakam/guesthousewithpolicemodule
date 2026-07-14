#!/bin/sh
# ─── GHMS Production Entry Point ───
# Listens on port 81. Tries node first, then bun.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/next-service-dist"

echo "[start] begin"
echo "[start] SCRIPT_DIR=$SCRIPT_DIR"
echo "[start] PATH=$PATH"

# Verify
if [ ! -f "$APP_DIR/server.js" ]; then
  echo "[start] ERROR: server.js missing at $APP_DIR/server.js"
  ls -la "$SCRIPT_DIR/" 2>/dev/null
  exit 1
fi
if [ ! -f "$APP_DIR/db/custom.db" ]; then
  echo "[start] ERROR: db missing at $APP_DIR/db/custom.db"
  exit 1
fi

cd "$APP_DIR" || exit 1

echo "[start] CWD=$(pwd)"
echo "[start] env file:"
cat .env 2>/dev/null

# Detect runtime
RUNTIME=""
if command -v node >/dev/null 2>&1; then
  RUNTIME=node
  echo "[start] using node $(node --version 2>&1)"
elif command -v bun >/dev/null 2>&1; then
  RUNTIME=bun
  echo "[start] using bun $(bun --version 2>&1)"
else
  echo "[start] ERROR: no node or bun. PATH=$PATH"
  exit 1
fi

export NODE_ENV=production
export PORT=81
export HOSTNAME=0.0.0.0

echo "[start] launching $RUNTIME on port $PORT ..."

# Run with stderr merged to stdout so all logs are visible
exec $RUNTIME server.js 2>&1