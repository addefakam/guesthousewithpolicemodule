#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"
pids=""

cleanup() {
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null
        fi
    done
    sleep 1
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null
        fi
    done
    exit 0
}

trap cleanup EXIT INT TERM

cd "$BUILD_DIR" || exit 1

DEFAULT_PACKAGED_DB_PATH="/app/db/custom.db"
DEFAULT_PACKAGED_DATABASE_URL="file:$DEFAULT_PACKAGED_DB_PATH"

if [ -f "./next-service-dist/server.js" ]; then
    cd next-service-dist/ || exit 1
    
    export NODE_ENV=production
    export PORT="${PORT:-3000}"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    export DATABASE_URL="${DATABASE_URL:-$DEFAULT_PACKAGED_DATABASE_URL}"

    if [ "$DATABASE_URL" = "$DEFAULT_PACKAGED_DATABASE_URL" ]; then
        if [ ! -f "$DEFAULT_PACKAGED_DB_PATH" ]; then
            echo "ERROR: Database not found: $DEFAULT_PACKAGED_DB_PATH"
            exit 1
        fi
    fi
    
    bun server.js &
    NEXT_PID=$!
    pids="$NEXT_PID"
    
    sleep 1
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "ERROR: Next.js failed to start"
        exit 1
    fi
    
    echo "Next.js started on port $PORT (PID: $NEXT_PID)"
    cd ../
fi

wait