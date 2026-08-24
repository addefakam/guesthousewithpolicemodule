#!/bin/bash
# =============================================================================
# GHMS — Update Script
# =============================================================================
# Run this to pull the latest code and restart the application.
# Usage: sudo ./update-ghms.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }

APP_DIR="/home/ghms/guesthousewithpolicemodule"

if [ ! -d "$APP_DIR" ]; then
  echo "ERROR: Project not found at $APP_DIR"
  echo "Run setup-local.sh first."
  exit 1
fi

echo ""
echo "── Updating GHMS ──────────────────────────────────────────────────────"
echo ""

# Pull latest code
log_info "Pulling latest code..."
cd "$APP_DIR"
su - ghms -c "cd $APP_DIR && git pull origin main" 2>&1 | tail -5
log_ok "Code updated"

# Install new dependencies
log_info "Installing dependencies..."
su - ghms -c "cd $APP_DIR && npm install" 2>&1 | tail -3
log_ok "Dependencies updated"

# Push any schema changes
log_info "Updating database schema..."
su - ghms -c "cd $APP_DIR && npx prisma db push" 2>&1 | tail -3
su - ghms -c "cd $APP_DIR && npx prisma generate" 2>&1 | tail -3
log_ok "Database schema updated"

# Run fix script
if [ -f "${APP_DIR}/scripts/fix-prisma-sql.js" ]; then
  su - ghms -c "cd $APP_DIR && node scripts/fix-prisma-sql.js" 2>&1
fi

# Rebuild for production if .next exists
if [ -d "${APP_DIR}/.next" ]; then
  log_info "Rebuilding for production..."
  su - ghms -c "cd $APP_DIR && npm run build" 2>&1 | tail -5
  log_ok "Build complete"
fi

# Restart service
log_info "Restarting GHMS service..."
systemctl restart ghms
sleep 3

if systemctl is-active --quiet ghms; then
  log_ok "GHMS updated and running!"
else
  log_warn "Service may not have started. Check: journalctl -u ghms -n 20"
fi

echo ""
echo "── Done ────────────────────────────────────────────────────────────────"
echo ""
