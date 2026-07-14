#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"

cd "$BUILD_DIR" || exit 1

# Database is packaged alongside the build artifacts
DB_PATH="$BUILD_DIR/db/custom.db"
export DATABASE_URL="file:$DB_PATH"

if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database not found: $DB_PATH"
    exit 1
fi

export NODE_ENV=production
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

cd next-service-dist/ || exit 1

echo "Starting Next.js standalone server on port $PORT..."
exec node server.js