#!/bin/sh
# ─── GHMS Production Entry Point ───
# Listens on port 81. Tries node first, then bun.
# POSIX-compatible (dash-safe).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/next-service-dist"
LOG_FILE="$APP_DIR/startup.log"

# Logging helper
log() {
  echo "[start] $1"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null
}

log "=== GHMS STARTUP BEGIN ==="
log "SCRIPT_DIR=$SCRIPT_DIR"
log "APP_DIR=$APP_DIR"
log "PATH=$PATH"
log "USER=$(whoami 2>/dev/null || echo unknown)"
log "HOSTNAME=$(hostname 2>/dev/null || echo unknown)"

# ── Verify critical files ──
if [ ! -f "$APP_DIR/server.js" ]; then
  log "ERROR: server.js missing at $APP_DIR/server.js"
  ls -la "$SCRIPT_DIR/" 2>/dev/null >> "$LOG_FILE" 2>/dev/null
  ls -la "$APP_DIR/" 2>/dev/null >> "$LOG_FILE" 2>/dev/null
  exit 1
fi
log "server.js: OK"

if [ ! -f "$APP_DIR/db/custom.db" ]; then
  log "ERROR: db missing at $APP_DIR/db/custom.db"
  ls -la "$APP_DIR/db/" 2>/dev/null >> "$LOG_FILE" 2>/dev/null
  exit 1
fi
log "custom.db: OK ($(du -h "$APP_DIR/db/custom.db" 2>/dev/null | cut -f1))"

# ── Switch to app directory ──
cd "$APP_DIR" || { log "ERROR: cannot cd to $APP_DIR"; exit 1; }
log "CWD=$(pwd)"

# ── Read .env if present and export DATABASE_URL explicitly ──
# Next.js standalone server.js does process.chdir(__dirname) then require('next').
# @next/env loads .env from CWD, but we also export explicitly for safety.
if [ -f .env ]; then
  log ".env contents:"
  cat .env >> "$LOG_FILE" 2>/dev/null
  # Source the .env to get DATABASE_URL into the environment
  DATABASE_URL_VAL=$(grep -v '^#' .env | grep 'DATABASE_URL' | head -1 | cut -d'=' -f2-)
  if [ -n "$DATABASE_URL_VAL" ]; then
    export DATABASE_URL="$DATABASE_URL_VAL"
    log "DATABASE_URL exported from .env: $DATABASE_URL"
  else
    log "WARNING: .env exists but no DATABASE_URL found"
  fi
else
  log "WARNING: .env file not found at $(pwd)/.env"
fi

# ── Detect runtime ──
RUNTIME=""
if command -v node >/dev/null 2>&1; then
  RUNTIME=node
  NODE_VER=$(node --version 2>&1)
  log "runtime: node $NODE_VER"
  # Check minimum Node.js version (18.18+)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\)\..*/\1/')
  NODE_MINOR=$(echo "$NODE_VER" | sed 's/v[0-9]*\.\([0-9]*\)\..*/\1/')
  if [ "$NODE_MAJOR" -lt 18 ] || { [ "$NODE_MAJOR" -eq 18 ] && [ "$NODE_MINOR" -lt 18 ]; }; then
    log "WARNING: Node.js $NODE_VER may be too old (need >=18.18)"
  fi
elif command -v bun >/dev/null 2>&1; then
  RUNTIME=bun
  log "runtime: bun $(bun --version 2>&1)"
else
  log "FATAL: no node or bun found in PATH=$PATH"
  exit 1
fi

# ── Test Prisma engine loading ──
log "Testing Prisma engine..."
PRISMA_TEST=$($RUNTIME -e "
try {
  const path = require('path');
  const enginePath = path.join(process.cwd(), 'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node');
  require('fs').accessSync(enginePath);
  process.stdout.write('engine_file: OK\\n');
  try {
    require(enginePath);
    process.stdout.write('engine_load: OK\\n');
  } catch(e) {
    process.stdout.write('engine_load: FAILED - ' + e.message + '\\n');
  }
} catch(e) {
  process.stdout.write('engine_file: MISSING - ' + e.message + '\\n');
  // Check for WASM fallback
  try {
    const wasmPath = path.join(process.cwd(), 'node_modules/.prisma/client/query_engine_bg.wasm');
    require('fs').accessSync(wasmPath);
    process.stdout.write('wasm_fallback: AVAILABLE\\n');
  } catch(e2) {
    process.stdout.write('wasm_fallback: MISSING\\n');
  }
}
" 2>&1)
log "Prisma test: $PRISMA_TEST"

# ── Test basic Next.js module loading ──
log "Testing Next.js module load..."
NX_TEST=$($RUNTIME -e "try { require('next'); process.stdout.write('OK'); } catch(e) { process.stdout.write('FAILED: ' + e.message); }" 2>&1)
log "Next.js load: $NX_TEST"

# ── Set production env ──
export NODE_ENV=production
export PORT=81
export HOSTNAME=0.0.0.0

log "Launching $RUNTIME on port $PORT ..."
log "=== GHMS SERVER START ==="

# Run with stderr merged to stdout so all logs are visible
exec $RUNTIME server.js 2>&1