#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="$SCRIPT_DIR/db/custom.db"
if [ ! -f "$DB_PATH" ]; then echo "ERROR: db not found"; exit 1; fi
echo "DATABASE_URL=file:$DB_PATH" > "$SCRIPT_DIR/next-service-dist/.env"
cd "$SCRIPT_DIR/next-service-dist" || exit 1
export NODE_ENV=production
export PORT=81
export HOSTNAME=0.0.0.0
exec node server.js