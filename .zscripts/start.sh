#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"

cd "$BUILD_DIR" || exit 1

# Database is packaged alongside the build artifacts
DB_PATH="$BUILD_DIR/db/custom.db"

if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database not found: $DB_PATH"
    exit 1
fi

export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

# Overwrite .env inside next-service-dist with ABSOLUTE database path.
# Prisma loads .env automatically and it OVERRIDES shell exports,
# so the relative path from build time would break after chdir.
echo "DATABASE_URL=file:$DB_PATH" > next-service-dist/.env

cd next-service-dist/ || exit 1

echo "Starting Next.js on port $PORT..."
exec node server.js