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

# Write ABSOLUTE database path into .env.
# Prisma loads .env automatically and it OVERRIDES shell exports.
echo "DATABASE_URL=file:$DB_PATH" > next-service-dist/.env

cd next-service-dist/ || exit 1

# Start Next.js in background
echo "Starting Next.js on port 3000..."
node server.js &
NEXT_PID=$!

# Wait for Next.js to be ready (max 60 seconds)
attempt=0
while [ $attempt -lt 60 ]; do
    if kill -0 "$NEXT_PID" 2>/dev/null; then
        # Try to connect
        if command -v curl >/dev/null 2>&1; then
            if curl -s --max-time 2 http://localhost:3000/ > /dev/null 2>&1; then
                echo "Next.js ready on port 3000 (PID: $NEXT_PID)"
                break
            fi
        else
            # No curl — just wait and hope
            if [ $attempt -ge 5 ]; then
                echo "Next.js started (PID: $NEXT_PID), no curl for health check"
                break
            fi
        fi
    else
        echo "ERROR: Next.js process died"
        exit 1
    fi
    sleep 1
    attempt=$((attempt + 1))
done

if [ $attempt -ge 60 ]; then
    echo "ERROR: Next.js failed to start within 60 seconds"
    exit 1
fi

# Start Caddy as the main foreground process on port 81
cd "$BUILD_DIR" || exit 1
echo "Starting Caddy on port 81..."
exec caddy run --config Caddyfile --adapter caddyfile