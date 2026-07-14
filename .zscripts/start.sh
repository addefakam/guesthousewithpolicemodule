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
export PORT=3000
export HOSTNAME=0.0.0.0

cd next-service-dist/ || exit 1

# Start Next.js in background
echo "Starting Next.js standalone server on port 3000..."
node server.js &
NEXT_PID=$!

# Wait for Next.js to be ready (max 30 seconds)
attempt=0
while [ $attempt -lt 30 ]; do
    if curl -s --max-time 2 http://localhost:3000/ > /dev/null 2>&1; then
        echo "Next.js is ready (PID: $NEXT_PID)"
        break
    fi
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "ERROR: Next.js process died"
        exit 1
    fi
    sleep 1
    attempt=$((attempt + 1))
done

if [ $attempt -ge 30 ]; then
    echo "ERROR: Next.js failed to start within 30 seconds"
    exit 1
fi

# Start Caddy on port 81 (platform health check port)
# In the publish container there is no pre-existing Caddy, so no conflict
cd "$BUILD_DIR" || exit 1
echo "Starting Caddy on port 81..."
exec caddy run --config Caddyfile --adapter caddyfile