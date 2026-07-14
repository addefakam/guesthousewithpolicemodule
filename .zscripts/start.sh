#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"

cd "$BUILD_DIR" || { echo "ERROR: cannot cd to $BUILD_DIR"; exit 1; }

DB_PATH="$BUILD_DIR/db/custom.db"
if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database not found: $DB_PATH"
    exit 1
fi

export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

# Write ABSOLUTE database path into .env
# Prisma loads .env and it OVERRIDES shell env exports
echo "DATABASE_URL=file:$DB_PATH" > next-service-dist/.env

cd next-service-dist/ || { echo "ERROR: cannot cd to next-service-dist"; exit 1; }

# Find a working JS runtime
RUNTIME=""
if command -v node >/dev/null 2>&1; then
    RUNTIME="node"
elif command -v bun >/dev/null 2>&1; then
    RUNTIME="bun"
else
    echo "ERROR: neither node nor bun found in PATH"
    echo "PATH=$PATH"
    exit 1
fi

echo "Starting Next.js with $RUNTIME on port $PORT..."

# Start Next.js in background
$RUNTIME server.js &
NEXT_PID=$!

# Wait for Next.js to be ready
attempt=0
ready=0
while [ $attempt -lt 60 ]; do
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "ERROR: Next.js process ($RUNTIME) died"
        exit 1
    fi
    if command -v curl >/dev/null 2>&1; then
        if curl -s --max-time 2 http://localhost:$PORT/ > /dev/null 2>&1; then
            ready=1
            break
        fi
    else
        # No curl available — give Next.js a few seconds
        if [ $attempt -ge 5 ]; then
            ready=1
            break
        fi
    fi
    sleep 1
    attempt=$((attempt + 1))
done

if [ $ready -eq 0 ]; then
    echo "ERROR: Next.js not ready after 60s"
    exit 1
fi

echo "Next.js ready on port $PORT (PID: $NEXT_PID, runtime: $RUNTIME)"

# Start Caddy as the main foreground process on port 81
cd "$BUILD_DIR" || exit 1
if [ -f Caddyfile ] && command -v caddy >/dev/null 2>&1; then
    echo "Starting Caddy on port 81..."
    exec caddy run --config Caddyfile --adapter caddyfile
else
    echo "WARNING: No Caddy or Caddyfile found, keeping $RUNTIME as foreground"
    # Caddy not available — keep Next.js alive as the main process
    wait
fi