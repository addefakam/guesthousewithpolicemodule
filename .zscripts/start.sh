#!/bin/sh
# ─── GHMS Production Start Script ───
# The database is INSIDE next-service-dist/db/custom.db
# The .env uses a RELATIVE path (file:db/custom.db)
# server.js does process.chdir(__dirname), so relative paths just work.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/next-service-dist"

echo "=== GHMS start ==="
echo "DIR=$SCRIPT_DIR"

# Verify app exists
if [ ! -f "$APP_DIR/server.js" ]; then
  echo "ERROR: server.js not found at $APP_DIR/server.js"
  exit 1
fi

# Verify database
if [ ! -f "$APP_DIR/db/custom.db" ]; then
  echo "ERROR: db not found at $APP_DIR/db/custom.db"
  exit 1
fi

cd "$APP_DIR" || exit 1

# Detect runtime: prefer node, fall back to bun
RUNTIME=""
if command -v node >/dev/null 2>&1; then
  RUNTIME="node"
elif command -v bun >/dev/null 2>&1; then
  RUNTIME="bun"
else
  echo "ERROR: no node or bun found. PATH=$PATH"
  exit 1
fi

export NODE_ENV=production
export PORT=81
export HOSTNAME=0.0.0.0

echo "Runtime: $RUNTIME | Port: $PORT | CWD: $(pwd)"
echo "Files: $(ls server.js .env db/custom.db 2>&1)"

exec $RUNTIME server.js